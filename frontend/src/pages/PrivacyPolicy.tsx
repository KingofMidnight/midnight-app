import Layout from "@/components/layout/Layout";

export default function PrivacyPolicy() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto py-12 px-4">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
          <p className="text-gray-700 mb-4">
            We collect information you provide directly, including account credentials, profile information,
            content you create, and communication preferences. When you use our service, we automatically collect
            usage data, including IP address, device information, and browser type.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
          <p className="text-gray-700 mb-4">
            We use your information to provide and improve our services, personalize your experience,
            enforce our terms, prevent fraud, and communicate with you. We may use aggregated, anonymized
            data for analytics and research purposes.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Data Security</h2>
          <p className="text-gray-700 mb-4">
            We implement industry-standard security measures to protect your data, including encryption,
            secure authentication, and regular security audits. However, no method of transmission over
            the internet is completely secure.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Your Rights</h2>
          <p className="text-gray-700 mb-4">
            You have the right to access, modify, or delete your personal data. You can manage your
            preferences in your account settings. To request data deletion, contact us at privacy@midnight.local.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Cookies</h2>
          <p className="text-gray-700 mb-4">
            We use cookies and similar technologies to enhance your experience, remember preferences,
            and track usage patterns. You can disable cookies in your browser settings, though this
            may impact functionality.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Third-Party Services</h2>
          <p className="text-gray-700 mb-4">
            We may share limited information with third-party services for analytics, payment processing,
            and content moderation. These services are bound by confidentiality agreements.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. GDPR Compliance</h2>
          <p className="text-gray-700 mb-4">
            For users in the EU, we comply with GDPR requirements. You have rights to data portability,
            withdrawal of consent, and objection to processing. Exercise these rights through your account or contact us.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Changes to This Policy</h2>
          <p className="text-gray-700 mb-4">
            We may update this policy periodically. We will notify you of significant changes via email
            or prominent notice on the site. Continued use constitutes acceptance of updated terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Contact Us</h2>
          <p className="text-gray-700 mb-4">
            For privacy concerns or requests, contact us at privacy@midnight.local or through our contact form.
            We respond to inquiries within 30 days.
          </p>
        </section>

        <p className="text-sm text-gray-500 mt-12">Last updated: April 2026</p>
      </div>
    </Layout>
  );
}
