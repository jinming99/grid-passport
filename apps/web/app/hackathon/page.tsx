import { HACKATHON_DATA } from "@/lib/hackathon-data";
import { HackathonHeader, HackathonFooter } from "@/components/hackathon/Shell";
import { Hero } from "@/components/hackathon/Hero";
import { Problems } from "@/components/hackathon/Problems";
import { Solution } from "@/components/hackathon/Solution";
import { Demo } from "@/components/hackathon/Demo";
import { Roundtrip } from "@/components/hackathon/Roundtrip";
import { Agents } from "@/components/hackathon/Agents";
import { CaseStudies } from "@/components/hackathon/CaseStudies";
import { ProofVsPremise } from "@/components/hackathon/ProofVsPremise";
import { UnderTheHood } from "@/components/hackathon/UnderTheHood";
import { Infrastructure } from "@/components/hackathon/Infrastructure";
import { TryIt } from "@/components/hackathon/TryIt";

export default function HackathonPage() {
  const data = HACKATHON_DATA;
  return (
    <>
      <HackathonHeader />
      <main>
        <Hero data={data} />
        <Problems data={data} />
        <Solution data={data} />
        <Demo data={data} />
        <Roundtrip />
        <Agents data={data} />
        <CaseStudies data={data} />
        <ProofVsPremise data={data} />
        <UnderTheHood data={data} />
        <Infrastructure data={data} />
        <TryIt data={data} />
      </main>
      <HackathonFooter />
    </>
  );
}
