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
              Welcome to our Terms & Conditions. This document outlines the rules and regulations for the use of our platform. By accessing this website, we assume you accept these terms and conditions in full. Do not continue to use our platform if you do not agree to all of the terms and conditions stated on this page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">User Responsibilities</h2>
            <p className="leading-relaxed">
              As a user of our platform, you agree to provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Any unauthorized use of your account must be immediately reported to our support team.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Orders and Payments</h2>
            <p className="leading-relaxed">
              All orders placed through the platform are subject to acceptance and availability. Prices for our products are subject to change without notice. We reserve the right to refuse any order you place with us. We may, in our sole discretion, limit or cancel quantities purchased per person, per household, or per order.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Refunds and Cancellations</h2>
            <p className="leading-relaxed">
              Our refund policy is designed to be fair and transparent. If you are not satisfied with your purchase, you may request a refund within a specified period, subject to certain conditions. Digital products may have different refund policies due to their nature. Please review the specific refund policy for each item before making a purchase.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Account Usage</h2>
            <p className="leading-relaxed">
              You agree not to use the platform for any illegal or unauthorized purpose. You must not, in the use of the service, violate any laws in your jurisdiction. Any breach of these terms may result in immediate termination of your account and access to the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Privacy and Data Protection</h2>
            <p className="leading-relaxed">
              Your privacy is important to us. We collect, process, and protect your personal data in accordance with our Privacy Policy. By using the platform, you consent to our data practices as described in the Privacy Policy. We implement security measures to protect your information from unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Intellectual Property</h2>
            <p className="leading-relaxed">
              All content included on the platform, such as text, graphics, logos, images, and software, is the property of the company or its content suppliers and is protected by intellectual property laws. You may not reproduce, duplicate, copy, sell, resell, or exploit any portion of the service without express written permission from us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Limitation of Liability</h2>
            <p className="leading-relaxed">
              In no event shall the company, its directors, employees, or affiliates be liable for any direct, indirect, incidental, special, or consequential damages arising out of or in any way connected with the use of the platform. This includes, but is not limited to, damages for loss of profits, data, or other intangible losses.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Contact Information</h2>
            <p className="leading-relaxed">
              If you have any questions or concerns about these Terms & Conditions, please contact us at our support email address. We aim to respond to all inquiries in a timely and helpful manner. Your feedback is valuable in helping us improve our platform and services.
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
