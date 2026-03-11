import logoImage from 'figma:asset/5652e42baeb9c05120117e539b7a8b70d5e36535.png';

export function Logo({ className = "h-12" }: { className?: string }) {
  return (
    <img 
      src={logoImage}
      alt="BLUE OCEAN HOTEL"
      className={className}
    />
  );
}