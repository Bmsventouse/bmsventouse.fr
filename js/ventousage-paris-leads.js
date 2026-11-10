/* Ventousage Paris: count genuine form submission attempts, never transmit visitor fields. */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form[name="ventousage-paris-devis"]');
  if (!form) return;
  form.addEventListener('submit', () => {
    // This event indicates intent, not a confirmed email or verified Netlify submission.
    window.BMSAnalytics?.track('quote_form_submit_attempt', { page_type: 'ventousage_paris' });
  });
});
