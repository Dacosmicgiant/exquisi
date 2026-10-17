export default function Splash() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="text-center">
        <p className="label-caps text-ornament">Stories at the table</p>
        <h1 className="mt-6 text-5xl tracking-tight sm:text-6xl">menu&nbsp;·&nbsp;stories</h1>
        <div className="mx-auto mt-8 h-px w-24 bg-ornament" />
        <p className="mx-auto mt-8 max-w-sm text-muted-foreground">
          Scan the code on your table to read the menu and discover the story behind each dish.
        </p>
      </div>
    </main>
  );
}
