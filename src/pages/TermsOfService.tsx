import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Terms of Service</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none">
            <div className="text-gray-300 space-y-6">
              <p>
                Welcome to Cuer Live ("Cuer", "we", "us", or "our"). These Terms of Service ("Terms") govern your use of the Cuer Live platform and services (collectively, the "Service"), available at https://cuer.live.
              </p>
              
              <p>
                By accessing or using Cuer Live, you agree to be bound by these Terms. If you do not agree, do not use the Service.
              </p>

              <div>
                <h2 className="text-xl font-semibold text-white mb-3">1. Who We Are</h2>
                <p>Cuer Live is operated by an individual doing business as Cuer Live based in California, United States.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-3">2. Eligibility</h2>
                <p>You must be at least 18 years old and legally able to enter into a binding contract to use the Service. By using Cuer Live, you represent and warrant that you meet these requirements.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-3">3. Your Account</h2>
                <p>To use Cuer Live, you must create an account by providing your email and a secure password. You are responsible for keeping your login credentials confidential and for any activity under your account.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-3">4. Subscription & Payment</h2>
                <p>Certain features of Cuer Live may require a paid subscription. Prices, features, and terms of payment are disclosed on our pricing page. We reserve the right to modify pricing or subscription plans at any time with reasonable notice.</p>
                <p>Failure to pay applicable fees may result in the suspension or termination of your access.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-3">5. Acceptable Use</h2>
                <p>You agree not to:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Use the Service for any unlawful or harmful purposes.</li>
                  <li>Attempt to reverse engineer, copy, or interfere with the Service.</li>
                  <li>Use the Service in a way that could damage or disrupt its performance for others.</li>
                </ul>
                <p>We reserve the right to suspend or terminate access to the Service if these Terms are violated.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-3">6. Ownership & License</h2>
                <p>All content, software, and technology underlying the Service are owned by or licensed to Cuer Live. You are granted a limited, non-exclusive, non-transferable license to use the Service solely for your internal business or professional use.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-3">7. Service Availability</h2>
                <p>We strive to provide a reliable service, but we do not guarantee uptime, accuracy, or uninterrupted availability, particularly in mobile environments. The Service is provided "as is" and "as available."</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-3">8. Disclaimer of Warranties</h2>
                <p>The Service is provided "AS IS" and "AS AVAILABLE," without warranty of any kind, express or implied. To the fullest extent permitted by law, Cuer Live disclaims all warranties, express, implied, statutory, or otherwise, including but not limited to implied warranties of merchantability, fitness for a particular purpose, title, non-infringement, system integration, and data accuracy.</p>
                <p>Cuer Live does not guarantee that the Service will be uninterrupted, error-free, secure, or that any defects will be corrected. You assume all responsibility for your use of the Service, including reliance on any output or timing-related features. No oral or written information or advice given by Cuer Live shall create any warranty not expressly stated herein.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-3">9. Limitation of Liability</h2>
                <p>To the maximum extent permitted by law, in no event shall Cuer Live or its owners, affiliates, agents, contractors, or licensors be liable for any direct, indirect, incidental, special, punitive, or consequential damages, including but not limited to loss of profits, loss of revenue, broadcast errors, missed cues, data loss, business interruption, or reputational harm, arising out of or related to your use of (or inability to use) the Service — even if advised of the possibility of such damages.</p>
                <p>This limitation applies to all causes of action, whether in contract, tort (including negligence), strict liability, or otherwise. In any event, Cuer Live's total liability shall not exceed the total amount paid by you for the Service in the six (6) months preceding the claim.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-3">10. Indemnification</h2>
                <p>You agree to defend, indemnify, and hold harmless Cuer Live, its owner, affiliates, and service providers from and against any claims, liabilities, damages, losses, and expenses, including legal and attorney's fees, arising out of or in any way connected with:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Your access to or use of the Service;</li>
                  <li>Your violation of these Terms;</li>
                  <li>Any data or content transmitted through your account;</li>
                  <li>Any third-party claims related to your use of the Service in connection with live broadcasts, commercial distribution, or public presentation.</li>
                </ul>
                <p>This includes but is not limited to lawsuits involving copyright violations, broadcast errors, or commercial disputes.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-3">11. Modifications</h2>
                <p>We reserve the right to modify or update these Terms at any time. If we make material changes, we'll provide notice (e.g., via email or platform banner). Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-3">12. Governing Law</h2>
                <p>These Terms are governed by the laws of the State of California, without regard to its conflict of law principles.</p>
                <p>Any disputes will be resolved exclusively in the state or federal courts located in California.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-3">13. Contact Us</h2>
                <p>For any questions or concerns about these Terms, you can contact us at:</p>
                <p className="font-mono">contact@cuer.live</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;