import Wip from "@/components/Wip";

export default function WipPage({ params }: { params: { id: string } }) {
  return <Wip id={params.id} />;
}
