export interface TeamMember {
  name: string;
  role: string;
  affiliation: string;
  note?: string;
}

export const TEAM: TeamMember[] = [
  {
    name: "Ming Jin",
    role: "Faculty mentor · project lead",
    affiliation: "Virginia Tech",
    note: "vision, design, foundation",
  },
  {
    name: "Bhawuk Luthra",
    role: "Co-conceptualizer · co-developer",
    affiliation: "Dominion Energy",
    note: "utility-side credibility anchor",
  },
  {
    name: "Vikrant Bhati",
    role: "Co-developer",
    affiliation: "Virginia Tech",
  },
];
