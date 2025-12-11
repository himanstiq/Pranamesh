import Image from 'next/image';

export default function Footer() {
    return (
        <footer className="mt-12 border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-dark dark:text-white">
            {/* Main Footer Content */}
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-10 md:grid-cols-12">
                {/* About Section with Logo */}
                <div className="md:col-span-5">
                    <div className="mb-4 flex items-center gap-3">
                        {/* CPCB Logo */}
                        <Image
                            src="/cpcb-logo.png"
                            alt="CPCB Logo"
                            width={56}
                            height={56}
                            className="rounded-full bg-white object-contain ring-1 ring-border-light dark:ring-border-dark"
                        />
                        <div>
                            <div className="text-lg font-semibold tracking-tight">
                                Central Control Room <br /> Air Quality Management
                            </div>
                        </div>
                    </div>
                    <address className="not-italic text-sm leading-6 text-text-muted-light dark:text-text-muted">
                        Delhi NCR, India
                    </address>
                    <div className="mt-4 space-y-1 text-sm">
                        <div>
                            <span className="font-medium">Phone No:</span> 079-25391811
                        </div>
                        <div>
                            <span className="font-medium">Email:</span>{' '}
                            <a href="mailto:feedback@aqi.gov.in" className="text-primary-light-theme dark:text-primary hover:underline">
                                feedback@aqi.gov.in
                            </a>
                        </div>
                    </div>
                </div>

                {/* Contact Section */}
                <div className="md:col-span-7">
                    <h3 className="mb-3 text-base font-semibold tracking-tight uppercase">Contact</h3>
                    <p className="text-sm text-text-muted-light dark:text-text-muted">
                        For any query regarding AQI or monitoring
                    </p>
                    <div className="mt-4 space-y-2 text-sm text-text-muted-light dark:text-text-muted">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-text-dark dark:text-white">Email:</span>
                            <a href="mailto:feedback@aqi.gov.in" className="text-primary-light-theme dark:text-primary hover:underline">
                                feedback@aqi.gov.in
                            </a>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-text-dark dark:text-white">Phone:</span>
                            <span className="text-primary-light-theme dark:text-primary">+91-9227898608</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Partner Logos Section */}
            <div className="border-t border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark">
                <div className="mx-auto max-w-7xl px-4 py-6">
                    <div className="mb-4 text-center text-sm font-semibold text-text-muted-light dark:text-text-muted">
                        Data Contributions are Acknowledged to
                    </div>
                    <div className="flex items-center justify-center">
                        <div className="flex items-center justify-center gap-6 md:gap-10 flex-wrap">
                            <Image
                                src="/cpcb-logo.png"
                                alt="CPCB"
                                width={60}
                                height={60}
                                className="h-14 w-auto object-contain"
                            />
                            <Image
                                src="/hspcb-logo.png"
                                alt="HSPCB"
                                width={60}
                                height={60}
                                className="h-14 w-auto object-contain"
                            />
                            <Image
                                src="/dpcc-logo.png"
                                alt="DPCC"
                                width={60}
                                height={60}
                                className="h-14 w-auto object-contain"
                            />
                            <Image
                                src="/rspcb-logo.png"
                                alt="RSPCB"
                                width={60}
                                height={60}
                                className="h-14 w-auto object-contain"
                            />
                            <Image
                                src="/safar-logo.png"
                                alt="SAFAR"
                                width={60}
                                height={60}
                                className="h-14 w-auto object-contain"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Copyright Bar */}
            <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 py-4 text-xs text-slate-200">
                <div className="flex flex-col items-start justify-between gap-3 px-4 sm:px-6 md:px-8 lg:px-12 sm:flex-row sm:items-center w-full">
                    <div>
                        Copyright © 2025. Central Control Room for Air Quality Management - Delhi NCR
                    </div>
                    <div>Designed and maintained by Central Control Room</div>
                </div>
            </div>
        </footer>
    );
}
