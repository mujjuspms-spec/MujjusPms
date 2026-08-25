export default function Icon({ name, className = 'icon', style }) {
  return (
    <svg className={className} style={style}>
      <use href={`#${name}`} />
    </svg>
  );
}
