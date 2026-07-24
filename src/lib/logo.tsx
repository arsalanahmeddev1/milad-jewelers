import logoUrl from "@/assets/milad-logo.png";

export function MiladLogo({ className = "w-20 h-20" }: { className?: string }) {
  return <img src={logoUrl} alt="Milad Jewelers" className={className} />;
}

export function MiladWordmark({ small = false }: { small?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <MiladLogo className={small ? "w-10 h-10" : "w-24 h-24"} />
      {!small && (
        <>
          <div className="mt-4 font-serif text-4xl tracking-[0.3em] text-primary">MILAD</div>
          <div className="mt-1 text-[0.7rem] tracking-[0.5em] text-muted-foreground">JEWELERS</div>
        </>
      )}
    </div>
  );
}
