export function StructuredData() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is My Budget Mate free?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We will be launching with paid, budget friendly plans.",
        },
      },
      {
        "@type": "Question",
        name: "Does it work with NZ banks?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! We connect to all major NZ banks through Akahu including ANZ, ASB, Westpac, BNZ, and Kiwibank. You can also link some investment providers like Booster.",
        },
      },
      {
        "@type": "Question",
        name: "Is this like YNAB for New Zealand?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We use similar envelope budgeting principles, but we're built specifically for NZ with fortnightly pay support and local bank connections through Akahu.",
        },
      },
      {
        "@type": "Question",
        name: "What is envelope budgeting?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Envelope budgeting means allocating your income into categories (envelopes) before you spend. Each dollar has a place to go each pay cycle, so you always know what's available.",
        },
      },
    ],
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "My Budget Mate",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "NZD",
      availability: "https://schema.org/PreOrder",
    },
    description:
      "Envelope budgeting app built for New Zealand pay cycles with Akahu bank sync. Fortnightly, weekly, and monthly pay support with guided setup by Remy, your financial coach.",
    url: "https://www.mybudgetmate.co.nz",
    author: {
      "@type": "Organization",
      name: "My Budget Mate",
      url: "https://www.mybudgetmate.co.nz",
    },
    featureList: [
      "NZ bank sync via Akahu",
      "Envelope budgeting",
      "Fortnightly pay cycle support",
      "Guided budget setup",
      "Debt snowball tracking",
      "Family and kids money management",
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareSchema),
        }}
      />
    </>
  );
}
