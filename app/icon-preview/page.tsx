"use client";

/**
 * Phosphor Icons Preview Page
 * Preview all available icons organized by category
 * Access at: /icon-preview
 */

import {
  getIconCategories,
  ICON_COLORS,
  PhosphorIcon,
} from "@/lib/icons/phosphor-icon-map";
import { EnvelopeIcon } from "@/components/shared/envelope-icon";
import { MASTER_ENVELOPE_LIST, CATEGORY_LABELS, type BuiltInCategory } from "@/lib/onboarding/master-envelope-list";
import { useMemo } from "react";

const CATEGORY_ORDER = [
  "Finance",
  "Shopping",
  "Home",
  "Utilities",
  "Health",
  "Food & Drink",
  "Transport",
  "Tech & Entertainment",
  "People & Life",
  "Celebrations",
  "Pets",
  "Education",
  "Insurance & Protection",
  "Nature",
  "Interface",
];

// Category display order (My Budget Way first, then alphabetical)
const ENVELOPE_CATEGORY_ORDER = [
  'my-budget-way',
  'bank',
  'celebrations',
  'extras',
  'giving',
  'goals',
  'health',
  'hobbies',
  'household',
  'insurance',
  'personal',
  'phone-internet',
  'school',
  'subscriptions',
  'vehicles',
];

export default function IconPreviewPage() {
  const iconCategories = getIconCategories();

  // Group envelopes by category
  const envelopesByCategory = useMemo(() => {
    return MASTER_ENVELOPE_LIST.reduce((acc, envelope) => {
      const cat = envelope.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(envelope);
      return acc;
    }, {} as Record<string, typeof MASTER_ENVELOPE_LIST>);
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-[#3D3D3D] mb-2">
        Phosphor Icons Preview
      </h1>
      <p className="text-[#6B6B6B] mb-8">
        Clean geometric icons by Phosphor Icons (MIT License - Free for commercial use)
      </p>

      {/* Color Swatches */}
      <div className="mb-8 p-4 bg-white rounded-xl border border-[#E5E7EB]">
        <h2 className="text-lg font-semibold text-[#3D3D3D] mb-3">Brand Colors</h2>
        <div className="flex flex-wrap gap-4">
          {Object.entries(ICON_COLORS).map(([name, color]) => (
            <div key={name} className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg border border-gray-200"
                style={{ backgroundColor: color }}
              />
              <div>
                <p className="text-sm font-medium text-[#3D3D3D]">{name}</p>
                <p className="text-xs text-[#6B6B6B]">{color}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Categories & Envelopes Table - FIRST */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-[#3D3D3D] mb-6 pb-2 border-b-2 border-[#7A9E9A]">
          Categories & Envelopes
        </h2>
        <p className="text-[#6B6B6B] mb-6">
          All envelope icons from the master list, organized by category.
        </p>

        {ENVELOPE_CATEGORY_ORDER.map((categoryKey) => {
          const envelopes = envelopesByCategory[categoryKey];
          if (!envelopes || envelopes.length === 0) return null;

          const categoryInfo = CATEGORY_LABELS[categoryKey as BuiltInCategory] || { label: categoryKey, icon: 'folder' };

          return (
            <div key={categoryKey} className="mb-8">
              {/* Category Header */}
              <div className="flex items-center gap-3 mb-3 bg-[#E2EEEC] p-3 rounded-lg">
                <PhosphorIcon name={categoryInfo.icon} size={28} color="#5A7E7A" />
                <h3 className="text-lg font-semibold text-[#3D3D3D]">
                  {categoryInfo.label}
                </h3>
                <span className="text-sm text-[#6B6B6B] ml-auto">
                  {envelopes.length} envelope{envelopes.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Envelopes Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#F3F4F6]">
                      <th className="text-left p-2 text-xs font-semibold text-[#6B6B6B] uppercase w-12">Icon</th>
                      <th className="text-left p-2 text-xs font-semibold text-[#6B6B6B] uppercase">Envelope Name</th>
                      <th className="text-left p-2 text-xs font-semibold text-[#6B6B6B] uppercase w-28">Icon Key</th>
                      <th className="text-left p-2 text-xs font-semibold text-[#6B6B6B] uppercase w-24">Subtype</th>
                      <th className="text-left p-2 text-xs font-semibold text-[#6B6B6B] uppercase w-28">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {envelopes.map((envelope) => (
                      <tr key={envelope.id} className="border-b border-[#E5E7EB] hover:bg-[#E2EEEC]/30">
                        <td className="p-2">
                          <PhosphorIcon name={envelope.icon} size={24} color={ICON_COLORS.sage} />
                        </td>
                        <td className="p-2">
                          <span className="font-medium text-[#3D3D3D]">{envelope.name}</span>
                          {envelope.description && (
                            <p className="text-xs text-[#9CA3AF] mt-0.5 line-clamp-1">{envelope.description}</p>
                          )}
                        </td>
                        <td className="p-2">
                          <code className="text-xs bg-[#F3F4F6] px-1.5 py-0.5 rounded text-[#6B6B6B]">
                            {envelope.icon}
                          </code>
                        </td>
                        <td className="p-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            envelope.subtype === 'bill' ? 'bg-[#DDEAF5] text-[#6B9ECE]' :
                            envelope.subtype === 'spending' ? 'bg-[#F5E6C4] text-[#D4A853]' :
                            envelope.subtype === 'savings' ? 'bg-[#E2EEEC] text-[#5A7E7A]' :
                            envelope.subtype === 'goal' ? 'bg-purple-100 text-purple-700' :
                            envelope.subtype === 'tracking' ? 'bg-[#F3F4F6] text-[#6B6B6B]' :
                            envelope.subtype === 'debt' ? 'bg-red-100 text-red-700' :
                            'bg-[#F3F4F6] text-[#6B6B6B]'
                          }`}>
                            {envelope.subtype}
                          </span>
                        </td>
                        <td className="p-2">
                          {envelope.priority ? (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              envelope.priority === 'essential' ? 'bg-[#DDEAF5] text-[#6B9ECE]' :
                              envelope.priority === 'important' ? 'bg-[#E2EEEC] text-[#5A7E7A]' :
                              'bg-[#F3F4F6] text-[#6B6B6B]'
                            }`}>
                              {envelope.priority}
                            </span>
                          ) : (
                            <span className="text-xs text-[#9CA3AF]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Icon Categories */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-[#3D3D3D] mb-6 pb-2 border-b-2 border-[#7A9E9A]">
          All Icons by Category
        </h2>
      </div>
      {CATEGORY_ORDER.map((category) => (
        <div key={category} className="mb-8">
          <h2 className="text-xl font-semibold text-[#3D3D3D] mb-4 pb-2 border-b border-[#E5E7EB]">
            {category}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Object.entries(iconCategories[category] || {}).map(([iconKey, IconComponent]) => (
              <div
                key={iconKey}
                className="flex flex-col items-center p-4 bg-white rounded-xl border border-[#E5E7EB] hover:border-[#7A9E9A] hover:shadow-sm transition-all"
              >
                {/* Icon in different colors */}
                <div className="flex gap-2 mb-3">
                  <IconComponent
                    size={32}
                    color={ICON_COLORS.sage}
                  />
                  <IconComponent
                    size={32}
                    color={ICON_COLORS.blue}
                  />
                  <IconComponent
                    size={32}
                    color={ICON_COLORS.textDark}
                  />
                </div>
                <p className="text-xs text-center text-[#6B6B6B]">{iconKey}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Size Comparison */}
      <div className="mb-8 p-6 bg-white rounded-xl border border-[#E5E7EB]">
        <h2 className="text-xl font-semibold text-[#3D3D3D] mb-4">Size Comparison</h2>
        <div className="flex items-end gap-6">
          {[16, 20, 24, 32, 40, 48, 64].map((size) => (
            <div key={size} className="flex flex-col items-center">
              <PhosphorIcon name="wallet" size={size} color={ICON_COLORS.sage} />
              <p className="text-xs text-[#6B6B6B] mt-2">{size}px</p>
            </div>
          ))}
        </div>
      </div>

      {/* Example Usage with EnvelopeIcon */}
      <div className="p-6 bg-[#E2EEEC] rounded-xl border border-[#B8D4D0]">
        <h2 className="text-xl font-semibold text-[#3D3D3D] mb-4">Example: Envelope Row</h2>
        <div className="space-y-3">
          {[
            { name: "Groceries", icon: "basket", amount: "$450.00" },
            { name: "Power Bill", icon: "zap", amount: "$180.00" },
            { name: "Car Expenses", icon: "car", amount: "$200.00" },
            { name: "Savings", icon: "piggy-bank", amount: "$500.00" },
            { name: "Holiday Goal", icon: "plane", amount: "$1,200.00" },
            { name: "Gym Membership", icon: "heart-beat", amount: "$65.00" },
          ].map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#E5E7EB]"
            >
              <EnvelopeIcon icon={item.icon} size={24} withBackground backgroundColor="#E2EEEC" />
              <span className="flex-1 font-medium text-[#3D3D3D]">{item.name}</span>
              <span className="text-[#5A7E7A] font-semibold">{item.amount}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="mt-8 p-6 bg-white rounded-xl border border-[#E5E7EB]">
        <h2 className="text-xl font-semibold text-[#3D3D3D] mb-4">Usage</h2>
        <div className="space-y-4 text-sm text-[#6B6B6B]">
          <div>
            <p className="font-medium text-[#3D3D3D] mb-1">Display an icon:</p>
            <code className="block bg-muted p-2 rounded text-xs">
              {`import { EnvelopeIcon } from "@/components/shared/envelope-icon";`}
              <br />
              {`<EnvelopeIcon icon="basket" size={24} />`}
            </code>
          </div>
          <div>
            <p className="font-medium text-[#3D3D3D] mb-1">Use the icon picker:</p>
            <code className="block bg-muted p-2 rounded text-xs">
              {`import { IconPicker } from "@/components/onboarding/icon-picker";`}
              <br />
              {`<IconPicker selectedIcon={icon} onIconSelect={setIcon} />`}
            </code>
          </div>
          <div>
            <p className="font-medium text-[#3D3D3D] mb-1">With background container:</p>
            <code className="block bg-muted p-2 rounded text-xs">
              {`<EnvelopeIcon icon="car" size={24} withBackground backgroundColor="#E2EEEC" />`}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
