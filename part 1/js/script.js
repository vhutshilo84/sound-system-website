const services = [
  {
    title: 'Audio equipment',
    category: 'equipment',
    description: 'Explore quality sound equipment for your home, work or community space.'
  },
  {
    title: 'Sound guidance',
    category: 'guidance',
    description: 'Get help understanding your options and choosing audio solutions that suit your needs.'
  },
  {
    title: 'Customer support',
    category: 'support',
    description: 'Reach out with questions or ask us about the products and services we offer.'
  }
];

let revealObserver = null;

document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('js-enabled');

  const yearText = document.querySelector('[data-current-year]');
  if (yearText) {
    yearText.textContent = new Date().getFullYear();
  }

  initializeCurrentTime();
  initializeBackToTop();
  initializeForms();
  initializeServiceBrowser();
  initializeGalleryLightbox();
  initializeAccordions();
  initializeRevealAnimations();
});

function initializeCurrentTime() {
  const clock = document.querySelector('#current-time');
  if (!clock) {
    return;
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });

  const updateTime = () => {
    const now = new Date();
    clock.dateTime = now.toISOString();
    clock.textContent = formatter.format(now);
  };

  updateTime();
  window.setInterval(updateTime, 1000);
}

function initializeBackToTop() {
  document.querySelectorAll('.back-to-top').forEach((button) => {
    button.addEventListener('click', () => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'instant' : 'smooth' });
    });
  });
}

function initializeForms() {
  document.querySelectorAll('form[data-form-purpose]').forEach((form) => {
    const response = form.querySelector('[data-form-response]');
    const fields = Array.from(form.querySelectorAll('input, select, textarea'));
    const dateField = form.querySelector('input[type="date"]');

    if (!response) {
      return;
    }

    if (dateField) {
      const today = new Date();
      dateField.min = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, '0'),
        String(today.getDate()).padStart(2, '0')
      ].join('-');
    }

    const getError = (field) => {
      if (field.validity.valueMissing) {
        return 'Please complete this field.';
      }
      if (field.validity.typeMismatch) {
        return 'Enter a valid email address.';
      }
      if (field.validity.patternMismatch) {
        return field.title || 'Enter a valid value.';
      }
      if (field.validity.tooShort) {
        return `Enter at least ${field.minLength} characters.`;
      }
      if (field.validity.tooLong) {
        return `Enter no more than ${field.maxLength} characters.`;
      }
      if (field.validity.rangeUnderflow) {
        return 'Choose today or a future date.';
      }
      return '';
    };

    const updateError = (field) => {
      const message = getError(field);
      const errorId = `${field.id}-error`;
      let error = document.getElementById(errorId);

      if (message && !error) {
        error = document.createElement('span');
        error.id = errorId;
        error.className = 'field-error';
        error.setAttribute('role', 'alert');
        field.insertAdjacentElement('afterend', error);
      }

      if (error) {
        error.textContent = message;
        error.hidden = !message;
      }

      if (message) {
        field.setAttribute('aria-invalid', 'true');
        field.setAttribute('aria-describedby', errorId);
      } else {
        field.removeAttribute('aria-invalid');
        if (field.getAttribute('aria-describedby') === errorId) {
          field.removeAttribute('aria-describedby');
        }
      }

      return !message;
    };

    fields.forEach((field) => {
      field.addEventListener('input', () => updateError(field));
      field.addEventListener('change', () => updateError(field));
    });

    form.addEventListener('invalid', (event) => {
      updateError(event.target);
      response.textContent = 'Please check the highlighted fields and try again.';
      response.classList.add('form-error');
    }, true);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      response.replaceChildren();
      response.classList.remove('form-error');

      const valid = fields.map(updateError).every(Boolean) && form.checkValidity();
      if (!valid) {
        response.textContent = 'Please check the highlighted fields and try again.';
        response.classList.add('form-error');
        form.reportValidity();
        const firstInvalid = fields.find((field) => !field.validity.valid);
        if (firstInvalid) {
          firstInvalid.focus();
        }
        return;
      }

      const values = new FormData(form);
      const purpose = form.dataset.formPurpose;
      const enquiryType = values.get('enquiryType') || values.get('messageType');
      const subject = purpose === 'enquiry'
        ? `Website enquiry: ${enquiryType}`
        : `Website contact: ${enquiryType}`;
      const body = fields
        .filter((field) => field.name)
        .map((field) => `${field.labels?.[0]?.textContent.trim() || field.name}: ${values.get(field.name) || 'Not provided'}`)
        .join('\n');
      const recipient = form.action.replace(/^mailto:/i, '');
      const emailLink = document.createElement('a');
      emailLink.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      emailLink.textContent = 'Open email draft to send your message';
      emailLink.className = 'form-email-link';

      const message = document.createElement('span');
      if (purpose === 'enquiry') {
        const eventDate = values.get('eventDate');
        message.textContent = `Your ${enquiryType.toLowerCase()} enquiry is ready. ${eventDate ? `We’ll review your requested date (${eventDate}) and confirm availability and pricing after receiving your details. ` : 'Availability and pricing will be confirmed after we receive your details. '}Your information has not been sent yet. `;
      } else {
        message.textContent = `Your ${enquiryType.toLowerCase()} message is ready. Your information has not been sent yet. `;
      }

      response.append(message, emailLink);
      response.classList.add('form-success');
    });
  });
}

function initializeServiceBrowser() {
  const results = document.querySelector('#service-results');
  const search = document.querySelector('#service-search');
  const category = document.querySelector('#service-category');
  const sort = document.querySelector('#service-sort');
  const status = document.querySelector('#service-results-status');

  if (!results || !search || !category || !sort || !status) {
    return;
  }

  const renderServices = () => {
    const query = search.value.trim().toLocaleLowerCase();
    const selectedCategory = category.value;
    const sortDirection = sort.value;
    const filteredServices = services
      .filter((service) => {
        const matchesQuery = `${service.title} ${service.description} ${service.category}`
          .toLocaleLowerCase()
          .includes(query);
        const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
        return matchesQuery && matchesCategory;
      })
      .sort((first, second) => {
        const comparison = first.title.localeCompare(second.title);
        return sortDirection === 'za' ? -comparison : comparison;
      });

    results.replaceChildren();

    if (filteredServices.length === 0) {
      const emptyMessage = document.createElement('p');
      emptyMessage.className = 'service-empty';
      emptyMessage.textContent = 'No services match your search. Try another keyword or category.';
      results.appendChild(emptyMessage);
    } else {
      filteredServices.forEach((service, index) => {
        const card = document.createElement('article');
        card.className = 'card service-card';
        card.dataset.reveal = '';

        const mark = document.createElement('span');
        mark.className = 'card-mark';
        mark.setAttribute('aria-hidden', 'true');
        mark.textContent = String(index + 1).padStart(2, '0');

        const heading = document.createElement('h3');
        heading.textContent = service.title;

        const description = document.createElement('p');
        description.textContent = service.description;

        card.append(mark, heading, description);
        results.appendChild(card);
        observeReveal(card);
      });
    }

    status.textContent = `${filteredServices.length} ${filteredServices.length === 1 ? 'service' : 'services'} found.`;
  };

  search.addEventListener('input', renderServices);
  category.addEventListener('change', renderServices);
  sort.addEventListener('change', renderServices);
  renderServices();
}

function initializeGalleryLightbox() {
  const galleryButtons = Array.from(document.querySelectorAll('[data-lightbox]'));
  if (galleryButtons.length === 0) {
    return;
  }

  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  dialog.setAttribute('aria-label', 'Image viewer');

  const closeButton = document.createElement('button');
  closeButton.className = 'lightbox-close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Close image viewer');
  closeButton.textContent = '×';

  const image = document.createElement('img');
  image.className = 'lightbox-image';

  const caption = document.createElement('p');
  caption.className = 'lightbox-caption';

  const controls = document.createElement('div');
  controls.className = 'lightbox-controls';

  const previousButton = document.createElement('button');
  previousButton.type = 'button';
  previousButton.textContent = 'Previous';
  previousButton.setAttribute('aria-label', 'Show previous image');

  const nextButton = document.createElement('button');
  nextButton.type = 'button';
  nextButton.textContent = 'Next';
  nextButton.setAttribute('aria-label', 'Show next image');

  controls.append(previousButton, nextButton);
  dialog.append(closeButton, image, caption, controls);
  document.body.appendChild(dialog);

  let currentIndex = 0;
  let lastTrigger = null;

  const showImage = (index) => {
    currentIndex = (index + galleryButtons.length) % galleryButtons.length;
    const trigger = galleryButtons[currentIndex];
    const sourceImage = trigger.querySelector('img');

    if (!sourceImage) {
      return;
    }

    image.src = sourceImage.currentSrc || sourceImage.src;
    image.alt = sourceImage.alt;
    caption.textContent = trigger.dataset.caption || sourceImage.alt;
  };

  galleryButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      lastTrigger = button;
      showImage(index);
      dialog.showModal();
      closeButton.focus();
    });
  });

  closeButton.addEventListener('click', () => dialog.close());
  previousButton.addEventListener('click', () => showImage(currentIndex - 1));
  nextButton.addEventListener('click', () => showImage(currentIndex + 1));

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  dialog.addEventListener('close', () => {
    if (lastTrigger) {
      lastTrigger.focus();
    }
  });

  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      showImage(currentIndex - 1);
    } else if (event.key === 'ArrowRight') {
      showImage(currentIndex + 1);
    }
  });
}

function initializeAccordions() {
  document.querySelectorAll('[data-accordion]').forEach((accordion) => {
    accordion.addEventListener('toggle', (event) => {
      const openedItem = event.target;
      if (!(openedItem instanceof HTMLDetailsElement) || !openedItem.open) {
        return;
      }

      accordion.querySelectorAll('details[open]').forEach((item) => {
        if (item !== openedItem) {
          item.open = false;
        }
      });
    }, true);
  });
}

function initializeRevealAnimations() {
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('[data-reveal]').forEach((element) => {
      element.classList.add('is-visible');
    });
    return;
  }

  revealObserver = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('[data-reveal]').forEach((element) => revealObserver.observe(element));
}

function observeReveal(element) {
  if (revealObserver) {
    revealObserver.observe(element);
  } else {
    element.classList.add('is-visible');
  }
}
