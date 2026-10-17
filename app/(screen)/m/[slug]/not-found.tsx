export default function ScreenNotFound() {
  return (
    <main className="diner grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-sm">
        <h1 className="text-3xl">Menu unavailable</h1>
        <div className="mx-auto my-6 max-w-[8rem] rule-double" />
        <p className="text-muted-foreground">We couldn’t find this menu. Please ask your server for help.</p>
      </div>
    </main>
  );
}
