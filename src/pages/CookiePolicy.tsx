import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import * as CookieConsent from 'vanilla-cookieconsent';

const CookiePolicy = () => {
  const navigate = useNavigate();

  const handleManageCookies = () => {
    CookieConsent.showPreferences();
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardContent className="p-6 md:p-8 space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Cookie Policy</h1>
              <p className="text-muted-foreground">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>

            <div className="space-y-4">
              <section>
                <h2 className="text-2xl font-semibold mb-3">What Are Cookies?</h2>
                <p className="text-foreground/90 leading-relaxed">
                  Cookies are small text files that are placed on your device when you visit our website. 
                  They help us provide you with a better experience by remembering your preferences and 
                  understanding how you use our services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">How We Use Cookies</h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  We use cookies for various purposes, including:
                </p>
                <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4">
                  <li>Essential functionality and security</li>
                  <li>Remembering your preferences and settings</li>
                  <li>Enabling chat support features</li>
                  <li>Understanding how you interact with our website</li>
                  <li>Improving our services based on usage patterns</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">Types of Cookies We Use</h2>
                
                <div className="space-y-6">
                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="text-xl font-semibold mb-2">Essential Cookies (Always Active)</h3>
                    <p className="text-foreground/90 leading-relaxed mb-2">
                      These cookies are necessary for the website to function and cannot be disabled in our systems. 
                      They are usually only set in response to actions made by you which amount to a request for services.
                    </p>
                    <div className="bg-muted p-4 rounded-md mt-2">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Cookie Name</th>
                            <th className="text-left py-2">Purpose</th>
                            <th className="text-left py-2">Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="py-2 font-mono">sb-*-auth-token</td>
                            <td className="py-2">Authentication</td>
                            <td className="py-2">Session</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 font-mono">cc_cookie</td>
                            <td className="py-2">Cookie consent preferences</td>
                            <td className="py-2">6 months</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="text-xl font-semibold mb-2">Functional Cookies</h3>
                    <p className="text-foreground/90 leading-relaxed mb-2">
                      These cookies enable enhanced functionality such as live chat support and saving your preferences. 
                      They may be set by us or by third-party providers whose services we use.
                    </p>
                    <div className="bg-muted p-4 rounded-md mt-2">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Cookie Name</th>
                            <th className="text-left py-2">Provider</th>
                            <th className="text-left py-2">Purpose</th>
                            <th className="text-left py-2">Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="py-2 font-mono">tawk_*</td>
                            <td className="py-2">Tawk.to</td>
                            <td className="py-2">Live chat support</td>
                            <td className="py-2">6 months</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="border-l-4 border-green-500 pl-4">
                    <h3 className="text-xl font-semibold mb-2">Analytics Cookies</h3>
                    <p className="text-foreground/90 leading-relaxed mb-2">
                      These cookies help us understand how visitors interact with our website by collecting and 
                      reporting information anonymously. This helps us improve our services.
                    </p>
                    <div className="bg-muted p-4 rounded-md mt-2">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Cookie Name</th>
                            <th className="text-left py-2">Provider</th>
                            <th className="text-left py-2">Purpose</th>
                            <th className="text-left py-2">Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="py-2 font-mono">_ga</td>
                            <td className="py-2">Google Analytics</td>
                            <td className="py-2">Distinguishes users</td>
                            <td className="py-2">2 years</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 font-mono">_ga_*</td>
                            <td className="py-2">Google Analytics</td>
                            <td className="py-2">Persists session state</td>
                            <td className="py-2">2 years</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 font-mono">_gid</td>
                            <td className="py-2">Google Analytics</td>
                            <td className="py-2">Distinguishes users</td>
                            <td className="py-2">24 hours</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 font-mono">_gat</td>
                            <td className="py-2">Google Analytics</td>
                            <td className="py-2">Throttles request rate</td>
                            <td className="py-2">1 minute</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Learn more about Google Analytics cookies:{' '}
                      <a
                        href="https://developers.google.com/analytics/devguides/collection/analyticsjs/cookie-usage"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Google Analytics Cookie Usage
                      </a>
                    </p>
                  </div>

                  <div className="border-l-4 border-orange-500 pl-4">
                    <h3 className="text-xl font-semibold mb-2">Marketing Cookies</h3>
                    <p className="text-foreground/90 leading-relaxed mb-2">
                      These cookies are used to track visitors across websites to display relevant and engaging advertisements. 
                      We currently do not use marketing cookies but reserve this category for future use.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">Managing Your Cookie Preferences</h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  You have full control over which cookies we use. You can change your preferences at any time by 
                  clicking the button below or using the Cookie Settings link in our footer.
                </p>
                <Button onClick={handleManageCookies} className="w-full sm:w-auto">
                  Manage Cookie Preferences
                </Button>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">Browser Cookie Controls</h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  Most web browsers allow you to control cookies through their settings. However, if you limit the 
                  ability of websites to set cookies, you may worsen your overall user experience.
                </p>
                <p className="text-foreground/90 leading-relaxed">
                  Learn how to manage cookies in your browser:
                </p>
                <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4 mt-2">
                  <li>
                    <a
                      href="https://support.google.com/chrome/answer/95647"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Google Chrome
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Mozilla Firefox
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Safari
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Microsoft Edge
                    </a>
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">Third-Party Cookies</h2>
                <p className="text-foreground/90 leading-relaxed">
                  Some cookies on our site are set by third-party service providers. We use:
                </p>
                <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4 mt-2">
                  <li>
                    <strong>Tawk.to</strong> for live chat support (Functional) -{' '}
                    <a
                      href="https://www.tawk.to/privacy-policy/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <strong>Google Analytics</strong> for website analytics (Analytics) -{' '}
                    <a
                      href="https://policies.google.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Privacy Policy
                    </a>
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">Updates to This Policy</h2>
                <p className="text-foreground/90 leading-relaxed">
                  We may update this Cookie Policy from time to time. When we make changes, we will update the 
                  "Last updated" date at the top of this policy. We encourage you to review this policy periodically.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">Contact Us</h2>
                <p className="text-foreground/90 leading-relaxed">
                  If you have any questions about our use of cookies, please contact us at{' '}
                  <a href="mailto:help@cuer.live" className="text-primary hover:underline">
                    help@cuer.live
                  </a>
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CookiePolicy;
