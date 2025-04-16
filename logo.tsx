interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Logo({ size = "md", className = "" }: LogoProps) {
  // Size variants - made heart smaller relative to text
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-9 w-9",
    lg: "h-11 w-11"
  };
  
  const textClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl"
  };
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg 
        className={sizeClasses[size]}
        viewBox="0 0 100 100" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Heart shape - exact match to the SHH logo */}
        <path 
          d="M50,80 C25,60 10,50 10,30 C10,15 20,10 30,10 C40,10 45,15 50,25 C55,15 60,10 70,10 C80,10 90,15 90,30 C90,50 75,60 50,80 Z" 
          fill="#b088f9" 
        />
        {/* ECG line - horizontal with peaks, matches image exactly */}
        <path 
          d="M25,50 L35,50 L40,35 L50,65 L60,35 L65,50 L75,50" 
          stroke="white" 
          strokeWidth="3.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      <span className={`font-display font-bold tracking-tight ${textClasses[size]}`}>
        Smart Health Hub
      </span>
    </div>
  );
}