'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Plus, ArrowLeft, Loader2, Wallet } from 'lucide-react';
import { cn } from '@/lib/cn';
import { toast } from 'sonner';

interface Envelope {
  id: string;
  name: string;
  icon?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  priority?: 'essential' | 'important' | 'discretionary' | null;
  current_amount?: number;
}

// Priority configuration
const PRIORITY_ORDER = ['essential', 'important', 'discretionary'] as const;
const PRIORITY_LABELS: Record<string, string> = {
  essential: 'Essential',
  important: 'Important',
  discretionary: 'Extras',
};
const PRIORITY_DOT_COLORS: Record<string, string> = {
  essential: 'bg-[#5A7E7A]',   // sage-dark
  important: 'bg-[#9CA3AF]',   // silver
  discretionary: 'bg-[#6B9ECE]', // blue
};

interface EnvelopeComboboxProps {
  value?: string | null;
  envelopeName?: string | null;
  transactionId: string;
  onAssigned: (envelopeId: string, envelopeName: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const QUICK_ICONS = ['💰', '🛒', '🍔', '🚗', '🏠', '⚡️', '💳', '✈️', '🎁', '📦'] as const;
type QuickIcon = typeof QUICK_ICONS[number];

export function EnvelopeCombobox({
  value,
  envelopeName,
  transactionId,
  onAssigned,
  placeholder = 'Select envelope...',
  disabled = false,
}: EnvelopeComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isAssigning, setIsAssigning] = useState(false);

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEnvelopeName, setNewEnvelopeName] = useState('');
  const [newEnvelopeIcon, setNewEnvelopeIcon] = useState<QuickIcon>(QUICK_ICONS[0]);
  const [isCreating, setIsCreating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Dropdown position state for portal (includes direction for smart positioning)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 256, openUp: false });
  const [isMounted, setIsMounted] = useState(false);

  // Track if component is mounted (needed for portal)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate dropdown position when opening - with smart flip detection
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const updatePosition = () => {
        const rect = buttonRef.current!.getBoundingClientRect();
        const dropdownHeight = 320; // max-h-80 = 320px
        const spaceBelow = window.innerHeight - rect.bottom - 8;
        const spaceAbove = rect.top - 8;

        // Flip to open upward if not enough space below but enough above
        const shouldOpenUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

        setDropdownPosition({
          top: shouldOpenUp ? rect.top - 4 : rect.bottom + 4,
          left: rect.left,
          width: Math.max(rect.width, 256),
          openUp: shouldOpenUp,
        });
      };
      updatePosition();

      // Reposition on scroll/resize
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  // Fetch envelopes when dropdown opens
  useEffect(() => {
    if (isOpen && envelopes.length === 0) {
      setIsLoading(true);
      fetch('/api/envelopes')
        .then((res) => res.json())
        .then((data) => {
          // API returns array directly, not { envelopes: [...] }
          const envelopeList = Array.isArray(data) ? data : (data.envelopes || []);
          setEnvelopes(envelopeList);
        })
        .catch((error) => {
          console.error('Failed to fetch envelopes:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, envelopes.length]);

  // Close dropdown when clicking outside (check both container and portal dropdown)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isInsideContainer = containerRef.current?.contains(target);
      const isInsideDropdown = dropdownRef.current?.contains(target);

      if (!isInsideContainer && !isInsideDropdown) {
        setIsOpen(false);
        setShowCreateForm(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter envelopes based on search query
  const filteredEnvelopes = useMemo(() => {
    if (!searchQuery) return envelopes;
    const query = searchQuery.toLowerCase();
    return envelopes.filter(
      (env) =>
        env.name.toLowerCase().includes(query) ||
        env.category_name?.toLowerCase().includes(query)
    );
  }, [envelopes, searchQuery]);

  // Group envelopes by priority
  const groupedEnvelopes = useMemo(() => {
    const groups: Record<string, Envelope[]> = {
      essential: [],
      important: [],
      discretionary: [],
    };
    const uncategorized: Envelope[] = [];

    for (const env of filteredEnvelopes) {
      const priority = env.priority || 'important'; // Default to important
      if (groups[priority]) {
        groups[priority].push(env);
      } else {
        uncategorized.push(env);
      }
    }

    return { groups, uncategorized };
  }, [filteredEnvelopes]);

  // Flatten for keyboard navigation
  const flatList = useMemo(() => {
    const items: (Envelope | 'create')[] = [];
    const { groups, uncategorized } = groupedEnvelopes;

    // Add envelopes in priority order
    for (const priority of PRIORITY_ORDER) {
      if (groups[priority]?.length) {
        items.push(...groups[priority]);
      }
    }
    // Add uncategorized
    items.push(...uncategorized);
    // Add create option
    items.push('create');

    return items;
  }, [groupedEnvelopes]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (showCreateForm) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowCreateForm(false);
        setNewEnvelopeName('');
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, flatList.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        const item = flatList[highlightedIndex];
        if (item === 'create') {
          handleShowCreateForm();
        } else if (item) {
          handleSelect(item);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current && highlightedIndex >= 0) {
      const items = listRef.current.querySelectorAll('[data-item]');
      items[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const handleSelect = async (envelope: Envelope) => {
    setIsAssigning(true);
    try {
      const response = await fetch(`/api/transactions/${transactionId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ envelope_id: envelope.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to assign envelope');
      }

      onAssigned(envelope.id, envelope.name);
      setIsOpen(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to assign envelope:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to assign envelope');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleShowCreateForm = () => {
    setNewEnvelopeName(searchQuery);
    setShowCreateForm(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleCreateEnvelope = async () => {
    if (!newEnvelopeName.trim()) {
      toast.error('Envelope name is required');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/envelopes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newEnvelopeName.trim(),
          icon: newEnvelopeIcon,
          subtype: 'spending',
          priority: 'important',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create envelope');
      }

      const created = await response.json();

      // Add to local list
      const newEnvelope: Envelope = {
        id: created.id,
        name: newEnvelopeName.trim(),
        icon: newEnvelopeIcon,
      };
      setEnvelopes((prev) => [...prev, newEnvelope]);

      // Auto-assign the new envelope
      await handleSelect(newEnvelope);

      toast.success(`Created "${newEnvelope.name}"`);

      // Reset form
      setShowCreateForm(false);
      setNewEnvelopeName('');
      setNewEnvelopeIcon(QUICK_ICONS[0]);
    } catch (error) {
      console.error('Failed to create envelope:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create envelope');
    } finally {
      setIsCreating(false);
    }
  };

  const displayValue = envelopeName || placeholder;
  const hasValue = !!envelopeName;

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || isAssigning}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border transition-colors w-full min-w-[140px]',
          'border-[#E5E7EB] bg-white hover:border-[#9CA3AF]',
          hasValue ? 'text-[#3D3D3D]' : 'text-[#9CA3AF]',
          disabled && 'opacity-50 cursor-not-allowed',
          isAssigning && 'opacity-70'
        )}
      >
        {isAssigning ? (
          <Loader2 className="h-4 w-4 animate-spin text-[#7A9E9A]" />
        ) : (
          <Wallet className="h-4 w-4 text-[#7A9E9A]" />
        )}
        <span className="flex-1 text-left truncate">{displayValue}</span>
        <ChevronDown className={cn('h-4 w-4 text-[#9CA3AF] transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown - rendered via portal to escape overflow containers */}
      {isOpen && isMounted && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 9999,
            maxHeight: 320,
            // When opening upward, translate Y by -100% so it appears above the trigger
            transform: dropdownPosition.openUp ? 'translateY(-100%)' : undefined,
          }}
          className="bg-white border border-[#E5E7EB] rounded-lg shadow-lg overflow-hidden flex flex-col"
        >
          {showCreateForm ? (
            // Create Form
            <div className="p-3 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-[#3D3D3D]">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewEnvelopeName('');
                  }}
                  className="p-1 hover:bg-[#F3F4F6] rounded"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span>Create New Envelope</span>
              </div>

              <input
                ref={inputRef}
                type="text"
                value={newEnvelopeName}
                onChange={(e) => setNewEnvelopeName(e.target.value)}
                placeholder="Envelope name..."
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#7A9E9A] text-[#3D3D3D] placeholder:text-[#9CA3AF]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newEnvelopeName.trim()) {
                    e.preventDefault();
                    handleCreateEnvelope();
                  }
                }}
              />

              <div className="flex flex-wrap gap-1">
                {QUICK_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setNewEnvelopeIcon(icon)}
                    className={cn(
                      'w-8 h-8 rounded border text-base flex items-center justify-center transition-colors',
                      newEnvelopeIcon === icon
                        ? 'border-[#7A9E9A] bg-[#E2EEEC]'
                        : 'border-[#E5E7EB] hover:border-[#9CA3AF]'
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleCreateEnvelope}
                disabled={!newEnvelopeName.trim() || isCreating}
                className={cn(
                  'w-full py-2 text-sm font-medium rounded-md transition-colors',
                  'bg-[#7A9E9A] text-white hover:bg-[#5A7E7A]',
                  (!newEnvelopeName.trim() || isCreating) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isCreating ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </span>
                ) : (
                  'Create & Assign'
                )}
              </button>
            </div>
          ) : (
            // Selection View
            <>
              {/* Search Input */}
              <div className="p-2 border-b border-[#E5E7EB]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  placeholder="Search envelopes..."
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#7A9E9A] text-[#3D3D3D] placeholder:text-[#9CA3AF]"
                  autoFocus
                />
              </div>

              {/* Envelope List */}
              <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-[#9CA3AF]" />
                  </div>
                ) : filteredEnvelopes.length === 0 && searchQuery ? (
                  <div className="py-4 text-center text-sm text-[#9CA3AF]">
                    No envelopes found
                    <button
                      type="button"
                      onClick={handleShowCreateForm}
                      className="block w-full mt-2 text-[#5A7E7A] hover:text-[#7A9E9A]"
                    >
                      Create &quot;{searchQuery}&quot;
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Priority-grouped envelopes */}
                    {PRIORITY_ORDER.map((priority) => {
                      const envs = groupedEnvelopes.groups[priority];
                      if (!envs?.length) return null;

                      return (
                        <div key={priority}>
                          <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#6B6B6B] bg-[#F3F4F6]">
                            <span className={cn('w-2 h-2 rounded-full', PRIORITY_DOT_COLORS[priority])} />
                            {PRIORITY_LABELS[priority]}
                          </div>
                          {envs.map((env) => {
                            const itemIndex = flatList.indexOf(env);
                            return (
                              <button
                                key={env.id}
                                type="button"
                                data-item
                                onClick={() => handleSelect(env)}
                                className={cn(
                                  'flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors',
                                  highlightedIndex === itemIndex
                                    ? 'bg-[#E2EEEC]'
                                    : 'hover:bg-[#F3F4F6]',
                                  value === env.id && 'font-medium'
                                )}
                              >
                                <Check
                                  className={cn(
                                    'h-4 w-4 text-[#7A9E9A] shrink-0',
                                    value === env.id ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                {env.icon ? (
                                  <span className="text-base">{env.icon}</span>
                                ) : (
                                  <Wallet className="h-4 w-4 text-[#7A9E9A] shrink-0" />
                                )}
                                <span className="flex-1 text-left text-[#3D3D3D] truncate">{env.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}

                    {/* Uncategorized envelopes */}
                    {groupedEnvelopes.uncategorized.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#6B6B6B] bg-[#F3F4F6]">
                          <span className="w-2 h-2 rounded-full bg-[#E5E7EB]" />
                          Other
                        </div>
                        {groupedEnvelopes.uncategorized.map((env) => {
                          const itemIndex = flatList.indexOf(env);
                          return (
                            <button
                              key={env.id}
                              type="button"
                              data-item
                              onClick={() => handleSelect(env)}
                              className={cn(
                                'flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors',
                                highlightedIndex === itemIndex
                                  ? 'bg-[#E2EEEC]'
                                  : 'hover:bg-[#F3F4F6]',
                                value === env.id && 'font-medium'
                              )}
                            >
                              <Check
                                className={cn(
                                  'h-4 w-4 text-[#7A9E9A] shrink-0',
                                  value === env.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {env.icon ? (
                                <span className="text-base">{env.icon}</span>
                              ) : (
                                <Wallet className="h-4 w-4 text-[#7A9E9A] shrink-0" />
                              )}
                              <span className="flex-1 text-left text-[#3D3D3D] truncate">{env.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Create new option */}
                    <div className="border-t border-[#E5E7EB]">
                      <button
                        type="button"
                        data-item
                        onClick={handleShowCreateForm}
                        className={cn(
                          'flex items-center gap-2 w-full px-3 py-2 text-sm text-[#5A7E7A] transition-colors',
                          highlightedIndex === flatList.length - 1
                            ? 'bg-[#E2EEEC]'
                            : 'hover:bg-[#F3F4F6]'
                        )}
                      >
                        <Plus className="h-4 w-4" />
                        <span>Create new envelope...</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
