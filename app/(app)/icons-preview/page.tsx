"use client";

/**
 * Icon Preview Page
 *
 * Displays all available Phosphor icons with their names for reference.
 * Access at: /icons-preview
 */

import { ICON_CATEGORIES, ICON_COLORS, PhosphorIcon, getPhosphorIcon } from "@/lib/icons/phosphor-icon-map";
import { MASTER_ENVELOPE_LIST, CATEGORY_LABELS, type BuiltInCategory } from "@/lib/onboarding/master-envelope-list";
import type { IconWeight } from "@phosphor-icons/react";

export default function IconsPreviewPage() {
  // Group envelopes by category
  const envelopesByCategory = MASTER_ENVELOPE_LIST.reduce((acc, envelope) => {
    const cat = envelope.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(envelope);
    return acc;
  }, {} as Record<string, typeof MASTER_ENVELOPE_LIST>);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-text-dark mb-2">
          Phosphor Icons Preview
        </h1>
        <p className="text-text-medium mb-8">
          All available icons for envelopes and categories. Icons by{" "}
          <a
            href="https://phosphoricons.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue hover:underline"
          >
            Phosphor Icons
          </a>{" "}
          (MIT License)
        </p>

        {/* ========== WEIGHT VARIANTS ========== */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-text-dark mb-6 border-b-2 border-sage pb-2">
            Weight Variants
          </h2>
          <p className="text-text-medium mb-6">
            Phosphor icons come in 6 weights, allowing for visual hierarchy and emphasis.
          </p>
          <div className="grid grid-cols-6 gap-4">
            {(["thin", "light", "regular", "bold", "fill", "duotone"] as IconWeight[]).map((weight) => {
              const WalletIcon = getPhosphorIcon("wallet");
              return (
                <div key={weight} className="flex flex-col items-center p-4 bg-silver-very-light rounded-lg">
                  <WalletIcon size={40} weight={weight} color={ICON_COLORS.sage} />
                  <span className="text-sm text-text-medium mt-2 capitalize">{weight}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========== CATEGORIES & ENVELOPES TABLE ========== */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-text-dark mb-6 border-b-2 border-sage pb-2">
            Categories & Envelopes
          </h2>

          {Object.entries(envelopesByCategory).map(([categoryKey, envelopes]) => {
            const categoryInfo = CATEGORY_LABELS[categoryKey as BuiltInCategory] || { label: categoryKey, icon: "folder" };

            return (
              <div key={categoryKey} className="mb-8">
                {/* Category Header */}
                <div className="flex items-center gap-3 mb-3 bg-sage-very-light p-3 rounded-lg">
                  <PhosphorIcon name={categoryInfo.icon} size={28} color={ICON_COLORS.sageDark} />
                  <h3 className="text-lg font-semibold text-text-dark">
                    {categoryInfo.label}
                  </h3>
                  <span className="text-sm text-text-medium ml-auto">
                    {envelopes.length} envelope{envelopes.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Envelopes Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-silver-very-light">
                        <th className="text-left p-2 text-xs font-semibold text-text-medium uppercase w-12">Icon</th>
                        <th className="text-left p-2 text-xs font-semibold text-text-medium uppercase">Envelope Name</th>
                        <th className="text-left p-2 text-xs font-semibold text-text-medium uppercase w-24">Icon Key</th>
                        <th className="text-left p-2 text-xs font-semibold text-text-medium uppercase w-24">Subtype</th>
                        <th className="text-left p-2 text-xs font-semibold text-text-medium uppercase w-28">Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {envelopes.map((envelope) => (
                        <tr key={envelope.id} className="border-b border-silver-light hover:bg-sage-very-light/30">
                          <td className="p-2">
                            <PhosphorIcon name={envelope.icon} size={24} color={ICON_COLORS.sage} />
                          </td>
                          <td className="p-2">
                            <span className="font-medium text-text-dark">{envelope.name}</span>
                            {envelope.description && (
                              <p className="text-xs text-text-light mt-0.5 line-clamp-1">{envelope.description}</p>
                            )}
                          </td>
                          <td className="p-2">
                            <code className="text-xs bg-silver-very-light px-1.5 py-0.5 rounded text-text-medium">
                              {envelope.icon}
                            </code>
                          </td>
                          <td className="p-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              envelope.subtype === "bill" ? "bg-blue-light text-blue" :
                              envelope.subtype === "spending" ? "bg-gold-light text-gold" :
                              envelope.subtype === "savings" ? "bg-sage-very-light text-sage-dark" :
                              envelope.subtype === "goal" ? "bg-purple-100 text-purple-700" :
                              envelope.subtype === "tracking" ? "bg-silver-very-light text-text-medium" :
                              envelope.subtype === "debt" ? "bg-red-100 text-red-700" :
                              "bg-silver-very-light text-text-medium"
                            }`}>
                              {envelope.subtype}
                            </span>
                          </td>
                          <td className="p-2">
                            {envelope.priority ? (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                envelope.priority === "essential" ? "bg-blue-light text-blue" :
                                envelope.priority === "important" ? "bg-sage-very-light text-sage-dark" :
                                "bg-silver-very-light text-text-medium"
                              }`}>
                                {envelope.priority}
                              </span>
                            ) : (
                              <span className="text-xs text-text-light">—</span>
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
        </section>

        {/* ========== ALL ICONS BY CATEGORY ========== */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-text-dark mb-6 border-b-2 border-sage pb-2">
            All Icons by Category
          </h2>

          {Object.entries(ICON_CATEGORIES).map(([categoryName, icons]) => (
            <div key={categoryName} className="mb-10">
              <h3 className="text-xl font-semibold text-text-dark mb-4 border-b border-silver-light pb-2">
                {categoryName}
              </h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4">
                {Object.entries(icons).map(([iconKey, IconComponent]) => (
                  <div
                    key={iconKey}
                    className="flex flex-col items-center p-3 rounded-lg border border-silver-light hover:border-sage hover:bg-sage-very-light/30 transition-colors"
                  >
                    <div className="w-10 h-10 flex items-center justify-center mb-2">
                      <IconComponent
                        size={32}
                        color={ICON_COLORS.sage}
                      />
                    </div>
                    <span className="text-xs text-text-medium text-center break-all">
                      {iconKey}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Color Variants Section */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-text-dark mb-4 border-b border-silver-light pb-2">
            Color Variants
          </h2>
          <p className="text-sm text-text-medium mb-4">
            Icons can be rendered in any color by changing the color prop.
          </p>
          <div className="flex gap-8 flex-wrap">
            {Object.entries(ICON_COLORS).map(([colorName, colorValue]) => (
              <div key={colorName} className="flex flex-col items-center">
                <div className="w-12 h-12 flex items-center justify-center mb-2">
                  <PhosphorIcon name="wallet" size={40} color={colorValue} />
                </div>
                <span className="text-xs text-text-medium">{colorName}</span>
                <span className="text-xs text-text-light">{colorValue}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Usage Example */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-text-dark mb-4 border-b border-silver-light pb-2">
            Usage
          </h2>
          <div className="bg-silver-very-light rounded-lg p-4 font-mono text-sm">
            <pre className="text-text-dark">{`// Using the EnvelopeIcon component
import { EnvelopeIcon } from "@/components/shared/envelope-icon";

<EnvelopeIcon icon="basket" size={24} />
<EnvelopeIcon icon="car" size={20} color="#6B9ECE" />

// Using the PhosphorIcon component directly
import { PhosphorIcon } from "@/lib/icons/phosphor-icon-map";

<PhosphorIcon name="wallet" size={24} color="#7A9E9A" />
<PhosphorIcon name="wallet" size={24} weight="bold" />`}</pre>
          </div>
        </section>
      </div>
    </div>
  );
}
