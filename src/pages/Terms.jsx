import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AmbientWaveBackground from '../components/AmbientWaveBackground';
import InteractiveGrid from '../components/InteractiveGrid';
import OnboardingModal from '../components/OnboardingModal';
import LoginModal from '../components/LoginModal';

const Terms = () => {
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: '#020617' }}>
      <AmbientWaveBackground />
      <InteractiveGrid />

      <Header
        onStartSelling={() => setIsOnboardingOpen(true)}
        onSignIn={() => setIsLoginOpen(true)}
      />

      <main className="flex-1 relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-8 pt-32 pb-24 text-slate-300">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">Terms & Conditions</h1>
        <p className="text-sm text-slate-500 mb-12">Last Updated: October 2023</p>

        <div className="space-y-8 glass-card p-8 sm:p-12">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Introduction</h2>
            <p className="leading-relaxed">
              Welcome to Koara. These Terms and Conditions ("Agreement") govern your access to and use of the Koara platform, website, applications, APIs, and all related services (collectively, the "Platform"). By creating an account, subscribing to a plan, accessing, or using the Platform, you acknowledge that you have read, understood, and agree to be legally bound by this Agreement, as well as any policies, guidelines, and additional terms published by Koara from time to time. If you do not agree to any part of this Agreement, you must not access or use the Platform. Koara provides a Software-as-a-Service (SaaS) platform that enables merchants to create and manage digital stores, integrate supported payment methods and digital product providers, and automate the fulfillment of digital products. Unless expressly stated otherwise, Koara is not the seller of products offered by merchants, is not a party to transactions between merchants and their customers, and does not receive or process payments made by end customers to merchants. This Agreement constitutes a legally binding contract between you and Koara and remains effective for as long as you access or use the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">User Responsibilities</h2>
            <p className="leading-relaxed">
              By using the Platform, you agree to use Koara only for lawful purposes and in accordance with this Agreement. You are responsible for ensuring that all information you provide is accurate, complete, and kept up to date. You must maintain the confidentiality of your account credentials and are solely responsible for all activities conducted through your account. You agree not to misuse the Platform, interfere with its operation, attempt to gain unauthorized access to any systems or data, upload malicious software, engage in fraudulent or deceptive activities, or violate any applicable laws or the rights of others. You must promptly notify Koara if you become aware of any unauthorized access to your account or any security incident that may affect your account or the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Orders and Payments</h2>
            <p className="leading-relaxed">
              Koara provides the technical infrastructure that enables Merchants to manage orders and automate the fulfillment of digital products. All purchases made by End Customers are transactions conducted directly between the Merchant and the End Customer. Unless expressly stated otherwise, Koara does not receive, process, hold, or transfer payments made by End Customers to Merchants and is not a party to such transactions. Merchants are solely responsible for configuring and maintaining their own payment methods, confirming customer payments, complying with applicable financial and tax regulations, and fulfilling their obligations to End Customers. Orders are processed using the Merchant's available Koara Balance, and if the Merchant's balance is insufficient, Koara may delay or decline fulfillment until the required balance has been restored. Koara reserves the right to suspend, reject, or cancel any order if fraud, unauthorized activity, security concerns, legal obligations, or violations of this Agreement are detected.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Refunds and Cancellations</h2>
            <p className="leading-relaxed">
              Unless otherwise expressly stated in this Agreement or required by applicable law, all subscription fees, service fees, and other payments made to Koara are non-refundable. Merchants may request the withdrawal of their remaining Koara Balance upon termination of their account, subject to successful identity verification, completion of all required compliance reviews, settlement of any outstanding obligations, and the conditions set forth in this Agreement. Any approved refund or balance withdrawal will be returned only through the original payment method used by the Merchant. Koara will not issue refunds or transfers to a different payment method, bank account, wallet, card, or any account belonging to a third party. If the original payment method is unavailable, Koara may retain the funds until the original payment method becomes available again or until another method is permitted by applicable law. Koara is not responsible for refunds, cancellations, chargebacks, or disputes arising between Merchants and their End Customers, as such matters remain the sole responsibility of the Merchant. Koara reserves the right to reject, delay, or suspend any refund or withdrawal request where fraud, unauthorized activity, legal obligations, security concerns, compliance reviews, or violations of this Agreement are suspected or identified.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Account Usage</h2>
            <p className="leading-relaxed">
              You are responsible for maintaining the security and confidentiality of your account credentials and for all activities conducted through your account. You must not share your account with any other person or allow unauthorized access to your account. All information provided during registration and throughout your use of the Platform must be accurate, complete, and kept up to date. You agree to use the Platform only for lawful purposes and in compliance with this Agreement and all applicable laws and regulations. You must not use the Platform to engage in fraudulent, deceptive, or unauthorized activities, interfere with the operation or security of the Platform, attempt to gain unauthorized access to any systems, distribute malicious software, exploit vulnerabilities, reverse engineer any part of the Platform except where permitted by applicable law, or use automated tools, bots, or scripts in a manner that disrupts or negatively affects the Platform. Koara reserves the right to suspend, restrict, or terminate any account, temporarily or permanently, if it reasonably believes that the account has been used in violation of this Agreement, poses a legal, security, or operational risk, or is involved in fraudulent or unauthorized activities.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Privacy and Data Protection</h2>
            <p className="leading-relaxed">
              Koara is committed to protecting the privacy and security of its users and processes personal information in accordance with its Privacy Policy and applicable data protection laws. By accessing or using the Platform, you acknowledge and agree that Koara may collect, use, store, process, and disclose information necessary to provide, maintain, improve, secure, and support the Platform, verify user identities, comply with legal and regulatory obligations, prevent fraud, and enforce this Agreement. Koara implements commercially reasonable administrative, technical, and organizational security measures to protect user information against unauthorized access, disclosure, alteration, or destruction. Passwords and authentication credentials are stored using secure encryption or hashing methods and are not accessible to Koara in their original form. While Koara takes reasonable measures to safeguard user information, no method of electronic transmission or storage is completely secure, and Koara cannot guarantee absolute security. Users are responsible for maintaining the confidentiality of their account credentials and for promptly notifying Koara of any suspected unauthorized access or security incident involving their account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Intellectual Property</h2>
            <p className="leading-relaxed">
              All intellectual property rights in and to the Platform, including but not limited to the Koara name, trademarks, logos, branding, software, source code, object code, APIs, databases, website design, user interface, graphics, text, documentation, content, and all related technologies are owned by or licensed to Koara and are protected by applicable intellectual property laws. Except as expressly permitted by this Agreement or with Koara's prior written consent, you may not copy, reproduce, modify, distribute, publish, sell, sublicense, reverse engineer, decompile, create derivative works from, or otherwise exploit any part of the Platform or its intellectual property. Nothing in this Agreement grants you ownership of or any rights in Koara's intellectual property other than the limited, non-exclusive, non-transferable, and revocable right to access and use the Platform in accordance with this Agreement. Any unauthorized use of Koara's intellectual property may result in the suspension or termination of your account and may subject you to legal action to the fullest extent permitted by applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Limitation of Liability</h2>
            <p className="leading-relaxed">
              To the fullest extent permitted by applicable law, Koara provides the Platform on an "as is" and "as available" basis without any guarantee that the Platform will operate uninterrupted, error-free, or without delays. Koara shall not be liable for any direct, indirect, incidental, consequential, special, exemplary, or punitive damages, including but not limited to loss of profits, revenue, business opportunities, customers, goodwill, data, or anticipated savings arising out of or relating to the use of, or inability to use, the Platform. Koara is not responsible for the actions, omissions, products, services, representations, pricing, marketing practices, or legal compliance of any Merchant, End Customer, payment provider, digital product provider, or other third party. Koara shall not be liable for any losses resulting from service interruptions, technical failures, cyberattacks, unauthorized access, force majeure events, failures of third-party services, or the unavailability of digital products supplied by external providers. Nothing in this Agreement shall exclude or limit any liability that cannot be excluded or limited under applicable law. Where permitted by applicable law, Koara's total aggregate liability arising out of or relating to this Agreement shall not exceed the total amount of fees paid by the Merchant to Koara during the twelve (12) months immediately preceding the event giving rise to the claim.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Contact Information</h2>
            <p className="leading-relaxed">
              If you have any questions, concerns, or requests regarding this Agreement or the Platform, you may contact Koara through the following official communication channels:
              <br />
              Support Email: support@getkoara.com
              <br />
              Official Username: @getkoara
              <br /><br />
              Koara may update its contact information from time to time. The most current contact details will always be available on the official Koara website. Communications sent through the contact channels listed above shall be considered official communications from or to Koara where applicable.
            </p>
          </section>
        </div>
      </main>

      <Footer />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
      />
    </div>
  );
};

export default Terms;