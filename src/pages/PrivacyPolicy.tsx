import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicy = () => {
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
            <CardTitle className="text-2xl text-white">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none">
            <div className="text-gray-300 space-y-6">
              <p>
                Cuer Live ("Cuer", "we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and store your information when you use our platform at https://cuer.live and related services (collectively, the "Service").
              </p>
              
              <p>
                By using the Service, you consent to the practices described in this policy.
              </p>

              <div>
                <h2 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
                <p>We collect the following categories of data:</p>
                
                <div className="ml-4 space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">1.1 User Profile Data</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Full Name (optional)</li>
                      <li>Email Address (required for account creation)</li>
                      <li>Account creation timestamps</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">1.2 Content & Usage Data</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Rundown content, including titles, segments, scripts, timing data, notes, and custom layouts</li>
                      <li>Blueprint documents such as show planning notes, camera plots, and component ordering</li>
                      <li>Undo/redo history for content editing</li>
                      <li>User preferences (e.g., column layouts, folders, timezone settings)</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">1.3 Team & Collaboration Data</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Team names and roles (admin/member)</li>
                      <li>Team join dates and invitation records</li>
                      <li>Emails used for team invitations (with expiration tracking)</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">1.4 File & Media Content</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>External image URLs referenced in rundowns</li>
                      <li>Data from imported CSV files</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">1.5 Usage & Activity Data</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Real-time session presence (to support live collaboration)</li>
                      <li>AI chat history from the Cuer AI assistant</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">1.6 Technical & Operational Data</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>User IDs and internal database references</li>
                      <li>Timestamps for content creation and updates</li>
                      <li>Archive status for rundowns</li>
                      <li>Rundown sharing settings (e.g., private, team, or public)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-3">2. Google Sign-In Data</h2>
                <p>When you choose to sign in with Google, we receive limited information from your Google Account:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Your email address</li>
                  <li>Your name (if provided in your Google Account)</li>
                  <li>Your Google profile picture (if available)</li>
                </ul>
                <p className="mt-3">
                  <strong>Cuer Live's use and transfer to any other app of information received from Google APIs will adhere to{' '}
                  <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                    Google API Services User Data Policy
                  </a>, including the Limited Use requirements.</strong>
                </p>
                <p className="mt-2">We use this information solely to:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Create and authenticate your Cuer Live account</li>
                  <li>Identify you when you sign in</li>
                  <li>Display your name and profile in the app</li>
                </ul>
                <p className="mt-2">
                  We do not access any other Google services or data. We do not store your Google password. 
                  You can revoke Cuer Live's access to your Google account at any time through your{' '}
                  <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                    Google Account settings
                  </a>.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-3">3. What We Do <em>Not</em> Collect</h2>
                <ul className="list-disc pl-6 space-y-1">
                  <li>We do not access your Gmail, Google Drive, Calendar, or any other Google services beyond basic profile information</li>
                  <li>We do not use third-party analytics tools (e.g., Google Analytics or Facebook Pixel)</li>
                  <li>We do not collect device fingerprinting or unique hardware identifiers</li>
                  <li>We do not collect location data (timezone is user-selected)</li>
                  <li>We do not track external websites or browsing behavior</li>
                  <li>We do not collect data for advertising or remarketing purposes</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-3">4. How We Use Your Information</h2>
                <p>We use the collected information to:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Provide, maintain, and improve the Service</li>
                  <li>Enable team collaboration and real-time editing</li>
                  <li>Personalize your experience (e.g., saved layouts and preferences)</li>
                  <li>Offer support and resolve issues</li>
                  <li>Monitor performance and system integrity</li>
                </ul>
                <p>We do not sell, rent, or share your personal data with advertisers or data brokers.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-3">5. Data Storage and Security</h2>
                <p>All data is securely stored using Supabase, a privacy-conscious cloud database provider. Passwords are securely hashed and cannot be viewed by us. We follow best practices to protect your data from unauthorized access, alteration, or disclosure.</p>
                <p>Data received from Google Sign-In is treated with the same security standards as all other user data and is never shared with third parties for advertising or marketing purposes.</p>
                <p>However, no system is 100% secure. By using the Service, you acknowledge and accept this risk.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-3">6. Data Sharing and Disclosure</h2>
                <p>We may share your data only under these circumstances:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>To comply with legal obligations or law enforcement requests</li>
                  <li>To investigate and prevent abuse, fraud, or security issues</li>
                  <li>In connection with a business transfer (e.g., merger, acquisition)</li>
                </ul>
                <p>We will never share your data with third parties for marketing purposes.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-3">7. Your Rights and Choices</h2>
                <p>You can:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Access or update your profile information at any time</li>
                  <li>Delete your account by contacting support</li>
                  <li>Adjust visibility settings for rundowns (private/team/public)</li>
                </ul>
                <p>If you're located in California or another region with specific privacy laws (e.g., GDPR), you may have additional rights including:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>The right to know what data we hold</li>
                  <li>The right to request deletion or correction</li>
                  <li>The right to restrict certain types of processing</li>
                </ul>
                <p>To exercise these rights, contact us at the email below.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-3">8. Children's Privacy</h2>
                <p>Cuer Live is not intended for children under 18. We do not knowingly collect personal information from minors. If we discover that we've inadvertently collected data from a child under 18, we will promptly delete it.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-3">9. Changes to This Policy</h2>
                <p>We may update this Privacy Policy from time to time. If changes are significant, we will notify you via email or platform notice. Continued use of the Service after changes constitutes acceptance of the updated policy.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-3">10. Contact Us</h2>
                <p>For privacy-related questions or requests, contact:</p>
                <p className="font-mono">info@cuer.live</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;