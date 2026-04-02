export default function Card({ title, children, wide = false }) {
  return (
    <section className={`card${wide ? ' wide' : ''}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
