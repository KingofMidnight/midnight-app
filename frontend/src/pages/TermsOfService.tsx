import Layout from "@/components/layout/Layout";

export default function TermsOfService() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto py-12 px-4">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-700 mb-4">
            By accessing and using Midnight, you accept and agree to be bound by the terms and provision
            of this agreement. If you do not agree to abide by the above, please do not use this service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. License Grant</h2>
          <p className="text-gray-700 mb-4">
            We grant you a limited, non-exclusive, non-transferable license to access and use Midnight
            for personal, non-commercial purposes. You may not reproduce, distribute, or transmit content
            without explicit permission.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. User Content</h2>
          <p className="text-gray-700 mb-4">
            You retain ownership of content you create. By uploading, you grant Midnight a worldwide,
            royalty-free license to display and distribute your content. You represent that you own or have
            the right to share all content uploaded.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Prohibited Activities</h2>
          <p className="text-gray-700 mb-4">
            Users may not:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>Violate any laws or regulations</li>
            <li>Upload copyrighted content without permission</li>
            <li>Harass, abuse, or threaten other users</li>
            <li>Spam, manipulate votes, or engage in market manipulation</li>
            <li>Attempt to bypass security measures</li>
            <li>Upload malware or malicious code</li>
            <li>Engage in child exploitation or abuse</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. DMCA Compliance</h2>
          <p className="text-gray-700 mb-4">
            We respect intellectual property rights. Copyright holders may submit DMCA takedown notices.
            We respond to valid notices within 48 hours. Users who repeatedly infringe copyright will be banned.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Age Restrictions</h2>
          <p className="text-gray-700 mb-4">
            Midnight is not intended for users under 13. If you are under 13, you must have parental
            consent. We comply with COPPA regulations. Users must be at least 18 to access mature content.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Account Responsibility</h2>
          <p className="text-gray-700 mb-4">
            You are responsible for maintaining the confidentiality of your account credentials and all
            activity under your account. You agree to notify us immediately of unauthorized access.
            We are not liable for losses resulting from unauthorized account use.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
          <p className="text-gray-700 mb-4">
            Midnight is provided "as is" without warranties. We are not liable for indirect, incidental,
            special, consequential, or punitive damages. Our total liability is limited to the amount you paid us.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Governing Law</h2>
          <p className="text-gray-700 mb-4">
            These terms are governed by applicable laws. Any disputes shall be resolved through binding arbitration.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Modifications</h2>
          <p className="text-gray-700 mb-4">
            We may modify these terms at any time. We will notify users of significant changes.
            Continued use after modification constitutes acceptance of new terms.
          </p>
        </section>

        <p className="text-sm text-gray-500 mt-12">Last updated: April 2026</p>
      </div>
    </Layout>
  );
}
