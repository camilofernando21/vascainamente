// Ported from Bam83's #presser, with the club texture in black and white instead of the video.
export default function HistoricQuote() {
  return (
    <section id="vm-presser" aria-label="Resposta Histórica">
      <div id="vm-presser-bg" aria-hidden="true" />
      <div id="vm-presser-overlay" aria-hidden="true" />
      <blockquote id="vm-presser-quote">
        <p className="presser-quote-text">&ldquo;O clube que abriu as portas para todos.&rdquo;</p>
        <cite className="vm-label presser-quote-attr">Resposta Histórica · 7 de abril de 1924</cite>
      </blockquote>
    </section>
  );
}
