type Props = {
  title: string;
  description: string;
};

export function SectionPlaceholder({ title, description }: Props) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <div className="rounded-2xl border border-[#e6eef3] bg-white px-6 py-12 shadow-[0_8px_30px_rgba(15,58,82,0.05)]">
        <h2 className="text-xl font-semibold text-[#0f3a52]">{title}</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#6b7c89]">
          {description}
        </p>
      </div>
    </section>
  );
}
