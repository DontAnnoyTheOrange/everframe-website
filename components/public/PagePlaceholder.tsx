export default function PagePlaceholder({
  title,
  phase,
}: {
  title: string;
  phase: string;
}) {
  return (
    <main className="px-6 py-20 md:px-16">
      <h1 className="text-bone font-serif text-4xl md:text-5xl">{title}</h1>
      <p className="text-stone mt-4 max-w-md">This page is built in {phase}.</p>
    </main>
  );
}
