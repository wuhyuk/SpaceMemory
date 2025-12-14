// src/components/etcView/Example.jsx
import React from 'react';
import './Example.css';

function Example() {
  return (
    <div className="example-page-wrapper scrollable">
      <main className="example-main-content">
        <div className="example-container">
          <h1 className="page-title">
            Examples of How to Use “Stars & Planets”
          </h1>

          {/* Example 1: Family Star */}
          <section className="section-card example-section">
            <h2>Example 1. A Family Star</h2>
            <p className="example-desc">
              You can create a dedicated star that collects only your most precious family memories.
              Add holiday gatherings, trips, and family events as separate planets, and attach tags such as
              <strong> #Family #Travel #Holidays </strong>
              so you can revisit those moments—and how you felt back then—anytime later.
            </p>
          </section>

          {/* Example 2: Growth Record Star */}
          <section className="section-card example-section">
            <h2>Example 2. My Growth Record Star</h2>
            <p className="example-desc">
              Create planets for each stage of your life—elementary school, middle school, high school,
              military service, university, and more—and save photos and notes together for each period.
              <br />
              It helps you reflect on how your life has unfolded, and how you want it to evolve from here.
            </p>
          </section>

          {/* Example 3: Hobby / Project Star */}
          <section className="section-card example-section">
            <h2>Example 3. A Hobby & Project Star</h2>
            <p className="example-desc">
              Build planets around a single theme—gaming, coding, fitness, music, and more—and organize your
              ongoing projects, what you learned, and what you felt in one place.
              <br />
              For example, create a <strong>Game Development Log</strong> planet and add screenshots as you implement features,
              try designs, and resolve bugs—turning it into your personal growth log and even a portfolio.
            </p>
          </section>

          {/* Closing Callout */}
          <section className="section-card callout-section">
            <h2>Create Your Own Category</h2>
            <p>
              These are just a few ways you can use it.
              <br />
              If you ever think, {'"Is this moment worth recording?"'}—it probably already is.
              That moment is a memory worth preserving as a star and planet.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Example;
