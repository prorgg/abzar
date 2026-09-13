document.addEventListener("DOMContentLoaded", () => {
  // --- ۱. مدیریت آکاردئون سوالات متداول ---
  const faqSection = document.getElementById("faq-section");

  if (faqSection) {
    faqSection.addEventListener("click", (event) => {
      const header = event.target.closest(".faq-header");
      if (!header) return;

      const currentItem = header.closest(".faq-item");
      const currentAnswer = currentItem.querySelector(".answer-box");
      const currentChevron = header.querySelector(".chevron-btn");
      const isOpen =
        currentAnswer.style.maxHeight &&
        currentAnswer.style.maxHeight !== "0px";

      // بستن تمام آیتم‌های دیگر (Accordion تک‌باز)
      faqSection.querySelectorAll(".faq-item").forEach((item) => {
        const answer = item.querySelector(".answer-box");
        const chevron = item.querySelector(".chevron-btn");

        answer.style.maxHeight = null;
        answer.classList.add("opacity-0");
        if (chevron) chevron.style.transform = "rotate(0deg)";
      });

      // اگر آیتم کلیک شده بسته بود، آن را باز کن
      if (!isOpen) {
        currentAnswer.style.maxHeight = currentAnswer.scrollHeight + "px";
        currentAnswer.classList.remove("opacity-0");
        if (currentChevron) currentChevron.style.transform = "rotate(180deg)";
      }
    });
  }

  // --- ۲. مدیریت اسلایدر نظرات مشتریان ---
  const cards = document.querySelectorAll("#reviews-section .review-card");
  const nextBtn = document.getElementById("nextBtn");
  const prevBtn = document.getElementById("prevBtn");

  if (cards.length > 0) {
    let currentIndex = 0;

    function updateSlider() {
      cards.forEach((card, index) => {
        const offset = index - currentIndex;

        if (offset === 0) {
          // کارت فعال (وسط)
          card.style.transform = "translateX(0) scale(1)";
          card.style.opacity = "1";
          card.style.zIndex = "20";
          card.style.pointerEvents = "auto";
        } else if (
          offset === 1 ||
          (offset === -(cards.length - 1) && currentIndex === cards.length - 1)
        ) {
          // کارت بعدی (سمت راست/خارج)
          card.style.transform = "translateX(60%) scale(0.85)";
          card.style.opacity = "0.4";
          card.style.zIndex = "10";
          card.style.pointerEvents = "none";
        } else if (
          offset === -1 ||
          (offset === cards.length - 1 && currentIndex === 0)
        ) {
          // کارت قبلی (سمت چپ/خارج)
          card.style.transform = "translateX(-60%) scale(0.85)";
          card.style.opacity = "0.4";
          card.style.zIndex = "10";
          card.style.pointerEvents = "none";
        } else {
          // سایر کارت‌ها
          card.style.transform = "translateX(0) scale(0.5)";
          card.style.opacity = "0";
          card.style.zIndex = "0";
          card.style.pointerEvents = "none";
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        currentIndex = (currentIndex + 1) % cards.length;
        updateSlider();
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        currentIndex = (currentIndex - 1 + cards.length) % cards.length;
        updateSlider();
      });
    }

    // اجرا در هنگام بارگذاری اولیه
    updateSlider();
  }
});
