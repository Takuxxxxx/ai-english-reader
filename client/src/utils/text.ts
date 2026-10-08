export function speak(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {
    /* speech not supported */
  }
}

export function splitSentences(p: string): string[] {
  const m = p.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g);
  return (m ?? [p]).map((s) => s.trim()).filter(Boolean);
}
