(() => {
  const VERSION = "0.2.9";

  document.title = `Eword Mobile Preview ${VERSION}`;

  document.querySelectorAll(".eyebrow").forEach((label) => {
    if (label.textContent.startsWith("Eword Mobile")) {
      label.textContent = `Eword Mobile ${VERSION}`;
    }
  });
})();
