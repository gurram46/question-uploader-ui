import React from 'react';

type DifficultyGuideProps = {
  compact?: boolean;
};

const panelStyle: React.CSSProperties = {
  marginTop: '10px',
  border: '1px solid #bfdbfe',
  borderRadius: '12px',
  background: 'linear-gradient(180deg, rgba(219,234,254,0.75), rgba(239,246,255,0.95))',
  boxShadow: '0 10px 24px rgba(59, 130, 246, 0.08)',
  overflow: 'hidden',
};

const summaryStyle: React.CSSProperties = {
  cursor: 'pointer',
  padding: '12px 14px',
  fontWeight: 600,
  color: '#1e3a8a',
  listStyle: 'none',
};

const bodyStyle: React.CSSProperties = {
  padding: '0 14px 14px',
  color: '#334155',
  fontSize: '14px',
  lineHeight: 1.6,
};

const blockTitleStyle: React.CSSProperties = {
  margin: '12px 0 6px',
  fontWeight: 700,
  color: '#1e3a8a',
};

const listStyle: React.CSSProperties = {
  margin: '0 0 10px 18px',
  padding: 0,
};

const DifficultyGuide: React.FC<DifficultyGuideProps> = ({ compact = false }) => {
  return (
    <details style={panelStyle}>
      <summary style={summaryStyle}>How to choose difficulty level and type</summary>
      <div style={bodyStyle}>
        {compact ? (
          <>
            <p style={{ margin: '0 0 10px' }}>
              Use the easiest rule possible.
            </p>
            <ul style={listStyle}>
              <li><strong>Level 1</strong>: easy and direct</li>
              <li><strong>Level 2</strong>: medium, needs some thinking</li>
              <li><strong>Level 3</strong>: hard, needs real reasoning</li>
            </ul>
            <ul style={listStyle}>
              <li><strong>facts</strong> = direct fact</li>
              <li><strong>definitions</strong> = asks meaning</li>
              <li><strong>matching</strong> = match items</li>
              <li><strong>statements</strong> = statement question</li>
              <li><strong>diagramatic</strong> = image/figure needed</li>
              <li><strong>numericals</strong> = calculation</li>
              <li><strong>assertion and reason</strong> = assertion-reason format</li>
            </ul>
            <p style={{ margin: 0 }}>
              If confused, choose the simpler option. Do not overrate difficulty.
            </p>
          </>
        ) : (
          <>
        <p style={{ margin: '0 0 10px' }}>
          Use this simple rule: first choose the <strong>level</strong> by how much thinking the student needs, then choose the <strong>type</strong> by what kind of question it is.
        </p>
        <div style={blockTitleStyle}>Step 1: choose the level</div>
        <ul style={listStyle}>
          <li>
            <strong>Level 1</strong>: the answer is direct. Student can answer from memory.
            Example: definition, fact, name, formula recall, very simple MCQ.
          </li>
          <li>
            <strong>Level 2</strong>: student must compare, interpret, match, read a statement, or use a diagram.
            Example: match the following, statement-based MCQ, simple application.
          </li>
          <li>
            <strong>Level 3</strong>: student must think in multiple steps.
            Example: assertion-reason, numerical solving, critical thinking, elimination-based reasoning.
          </li>
        </ul>
        <p style={{ margin: '0 0 10px' }}>
          Quick shortcut:
          If the answer is immediate, use <strong>Level 1</strong>.
          If it needs some interpretation, use <strong>Level 2</strong>.
          If it needs real reasoning or multi-step thinking, use <strong>Level 3</strong>.
        </p>
        {!compact && (
          <>
            <div style={blockTitleStyle}>Step 2: choose the type</div>
            <ul style={listStyle}>
              <li><strong>facts</strong>: plain factual recall</li>
              <li><strong>definitions</strong>: asks meaning, term, or concept definition</li>
              <li><strong>simple mcqs / direct mcqs</strong>: straightforward multiple-choice question</li>
              <li><strong>matching</strong>: match column A with column B</li>
              <li><strong>statements</strong>: statement I / II / III style question</li>
              <li><strong>diagramatic</strong>: answer depends on a figure, graph, or labelled image</li>
              <li><strong>assertion and reason</strong>: assertion-reason format</li>
              <li><strong>numericals</strong>: calculation-based question</li>
              <li><strong>critical thinking</strong>: reasoning-heavy question where student must analyze carefully</li>
            </ul>
            <p style={{ margin: '0 0 10px' }}>
              Choose the <strong>type</strong> from the main pattern of the question, not from whether the chapter itself is easy or hard.
            </p>
          </>
        )}
        <div style={blockTitleStyle}>If you are confused</div>
        <p style={{ margin: 0 }}>
          Do not overthink it. Pick the closest type, and keep the level on the lower side unless the question clearly needs more reasoning.
        </p>
          </>
        )}
      </div>
    </details>
  );
};

export default DifficultyGuide;
