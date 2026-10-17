/* Aparición progresiva de los elementos al entrar en pantalla. */
(function () {
  "use strict";

  var items = document.querySelectorAll(".reveal");
  if (!items.length) return;

  function showAll() {
    for (var i = 0; i < items.length; i += 1) {
      items[i].classList.add("is-visible");
    }
  }

  if (!("IntersectionObserver" in window)) {
    showAll();
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      for (var i = 0; i < entries.length; i += 1) {
        if (entries[i].isIntersecting) {
          entries[i].target.classList.add("is-visible");
          observer.unobserve(entries[i].target);
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );

  for (var i = 0; i < items.length; i += 1) {
    observer.observe(items[i]);
  }
})();
