// src/components/etcView/Introduction.jsx
import React from 'react';
import './Introduction.css';

function Introduction({ navigate, onLoginClick, isLoggedIn }) {
    const handleStartClick = () => {
        if (navigate) navigate("/");
        if (!isLoggedIn && onLoginClick) {
            onLoginClick();
        }
    };

    return (
        <div className="introduction-page-wrapper scrollable">
            <main className="introduction-main-content">
                <div className="introduction-container">
                    <h1 className="page-title">
                        Welcome to “Memory Space”,<br/>
                        where you create your own universe
                    </h1>

                    <section className="section-card hero-section">
                        <div className="hero-text">
                            <h2>🌌 Engrave Your Memories into the Universe</h2>
                            <p>
                                Turn ordinary moments from daily life into unforgettable stars.
                                “Memory Space” is a <strong>personalized memory archive website</strong> that preserves
                                your precious moments forever in a cosmic space.
                            </p>
                        </div>
                        {/* Image or animation placeholder */}
                        <div className="hero-visual">[Space / Planet Concept Image Placeholder]</div>
                    </section>
                    
                    <section className="section-card feature-section">
                        <h2>✨ Key Features</h2>
                        <div className="feature-grid">
                            <div className="feature-item">
                                <h3>Your Own Stars</h3>
                                <p>Create collections of stars to hold your memories.</p>
                            </div>
                            <div className="feature-item">
                                <h3>Create Your Own Planets</h3>
                                <p>
                                    Design and create unique planets based on meaningful themes,
                                    such as memories with loved ones or important life events.
                                </p>
                            </div>
                            <div className="feature-item">
                                <h3>Elements of Memory</h3>
                                <p>
                                    Store photos, videos, and written journals as media within each planet.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="section-card callout-section">
                        <h2>🌠 Start Your Journey Now!</h2>
                        <p>
                            Your memories are precious.
                            As a “Recorder of Stars,” turn moments you never want to forget
                            into a beautiful digital universe.
                            <br />
                            If you are ready to explore your own universe,
                            sign up now and create your very first planet.
                        </p>
                        <button className="cta-button primary-btn" onClick={handleStartClick}>
                            Start Creating My Universe
                        </button>
                    </section>
                </div>
            </main>
        </div>
    );
}

export default Introduction;
