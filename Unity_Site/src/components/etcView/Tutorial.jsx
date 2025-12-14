// src/components/etcView/Tutorial.jsx
import React from 'react';
import './Tutorial.css';

function Tutorial() {
  return (
    <div className="tutorial-page-wrapper scrollable">
      <main className="tutorial-main-content">
        <div className="tutorial-container">
          <h1 className="page-title">
            “Star Recorder” User Tutorial
          </h1>

          {/* 1. Getting Started */}
          <section className="section-card">
            <h2>1. Sign Up & Sign In</h2>
            <ul className="tutorial-list">
              <li>Click the <strong>Sign Up</strong> button in the top menu to create an account.</li>
              <li>Enter your username, password, nickname, email, and location to create your account.</li>
              <li>After signing up, click <strong>Sign In</strong> to activate your personal universe.</li>
            </ul>
          </section>

          {/* 2. Planets & Stars */}
          <section className="section-card">
            <h2>2. Creating Planets & Stars</h2>
            <ul className="tutorial-list">
              <li>
                From the universe shown on the main screen, create <strong>Planets</strong> and <strong>Stars</strong> that match your categories.
              </li>
              <li>You can create up to <strong>12 stars</strong> and <strong>7 planets</strong>.</li>
              <li>
                Each planet can contain photos, videos, and notes as <strong>Media</strong>.
              </li>
              <li>
                Adding tags to media allows you to easily group and revisit related memories later.
              </li>
            </ul>
          </section>

          {/* 3. Tags & Location */}
          <section className="section-card">
            <h2>3. Tags & Location</h2>
            <ul className="tutorial-list">
              <li>You can filter your memories using the <strong>tags</strong> attached to media.</li>
              <li>
                Saved location information is displayed on the <strong>World Map</strong>.
              </li>
            </ul>
          </section>

          {/* 4. Inquiries */}
          <section className="section-card callout-section">
            <h2>4. Have Questions While Using the Service?</h2>
            <p>
              If you have any questions or encounter issues while using the service,
              please leave a post on the
              <strong> 1:1 Inquiry Board</strong>.
              <br />
              An administrator will review it and respond.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Tutorial;
