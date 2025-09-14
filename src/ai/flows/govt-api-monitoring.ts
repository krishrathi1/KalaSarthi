export interface GovtScheme {
  id: string;
  title: string;
  description: string;
  eligibility: string;
  link: string;
  category: string;
  lastUpdated: string;
}

export async function monitorGovtAPIs({ lastChecked }: { lastChecked?: string }) {
  // Mock implementation - replace with actual API monitoring
  const newSchemes: GovtScheme[] = [
    {
      id: "mudra",
      title: "Pradhan Mantri MUDRA Yojana (PMMY)",
      description: "Provides loans up to ₹10 lakh to non-corporate, non-farm small/micro enterprises.",
      eligibility: "Any Indian Citizen with a business plan for non-farm sector.",
      link: "https://www.mudra.org.in/",
      category: "mudra",
      lastUpdated: new Date().toISOString()
    }
  ];

  return { newSchemes };
}
