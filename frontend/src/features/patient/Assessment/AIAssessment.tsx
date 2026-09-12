/**
 * ============================================================================
 * LIFELINK FRONTEND: AI HEALTH ASSESSMENT COMPONENT (features/patient/Assessment/AIAssessment.tsx)
 * ============================================================================
 * 
 * WHAT THIS COMPONENT DOES:
 * Provides an interactive clinical decision-support interface for patients:
 * 1. Symptom Collection: Gathers reported symptoms, age, biological gender, duration, and conditions.
 * 2. Real-Time AI Analysis: Submits data to `trpc.assessment.analyze` mutation for triage assessment.
 * 3. Triage Urgency Display: Renders color-coded urgency badges (LOW, MODERATE, EMERGENCY, ERROR).
 * 4. Emergency Action Workflow: If urgency is EMERGENCY, triggers prominent warning banner with 
 *    direct button to the SOS Emergency portal (`/patient/emergency`).
 * 5. Specialist Routing: Allows one-click handoff to find specialists in Mumbai matching the recommended field.
 * 6. Historical Triage Cards: Lists past persisted assessments fetched via `trpc.assessment.list`.
 */
import React, { useState } from 'react';
import { AlertCircle, ArrowRight, ShieldAlert, Stethoscope, Clock, Activity, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Popup } from '../../../components/ui/Popup';
import { trpc } from '../../../lib/trpc';

type AssessmentResult = {
  id: number;
  createdAt: Date | string;
  symptoms: string;
  age: number;
  gender: string;
  conditions?: string | null;
  duration: string;
  urgency: 'LOW' | 'MODERATE' | 'EMERGENCY' | 'ERROR';
  reason: string;
  specialty: string;
  guidance: string;
};

function urgencyBadgeStyle(urgency: AssessmentResult['urgency']) {
  if (urgency === 'EMERGENCY') {
    return { bg: 'rgba(220, 38, 38, 0.12)', color: 'var(--color-semantic-emergency)', border: '1px solid rgba(220, 38, 38, 0.2)' };
  }
  if (urgency === 'MODERATE') {
    return { bg: 'rgba(217, 119, 6, 0.12)', color: 'var(--color-semantic-warning)', border: '1px solid rgba(217, 119, 6, 0.2)' };
  }
  if (urgency === 'ERROR') {
    return { bg: 'rgba(225, 29, 72, 0.12)', color: '#e11d48', border: '1px solid rgba(225, 29, 72, 0.2)' };
  }
  return { bg: 'rgba(13, 148, 136, 0.12)', color: 'var(--color-semantic-success)', border: '1px solid rgba(13, 148, 136, 0.2)' };
}

export const AIAssessment = () => {
  const trpcUtils = trpc.useUtils();
  const savedAssessments = trpc.assessment.list.useQuery();
  const analyzeAssessment = trpc.assessment.analyze.useMutation();
  const navigate = useNavigate();

  const [symptoms, setSymptoms] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [conditions, setConditions] = useState('');
  const [duration, setDuration] = useState('');
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<AssessmentResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

  const resetForm = () => {
    setSymptoms('');
    setAge('');
    setGender('');
    setConditions('');
    setDuration('');
    setResult(null);
    setApiError(null);
  };

  const handleCloseResult = () => {
    setIsResultModalOpen(false);
    if (result?.urgency !== 'EMERGENCY') resetForm();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedAge = Number.parseInt(age, 10);
    if (!symptoms.trim() || Number.isNaN(parsedAge) || parsedAge < 0 || parsedAge > 120 || !gender || !duration.trim()) {
      setApiError('Please fill out all required fields with valid values (Age between 0 and 120).');
      return;
    }

    setIsProcessing(true);
    setApiError(null);
    try {
      const assessment = await analyzeAssessment.mutateAsync({
        symptoms: symptoms.trim(),
        age: parsedAge,
        gender,
        conditions: conditions.trim() || undefined,
        duration: duration.trim(),
      });
      await trpcUtils.assessment.list.invalidate();
      await trpcUtils.patientDashboard.summary.invalidate();
      setResult(assessment);
      setIsResultModalOpen(true);
    } catch (error: any) {
      console.error('Assessment failed', error);
      setApiError(error?.message || 'Live AI health assessment is temporarily unavailable. Please try again or seek appropriate professional medical care based on your symptoms.');
    } finally {
      setIsProcessing(false);
    }
  };

  const findSpecialist = () => {
    const specialtyToQuery = result?.specialty || selectedHistoryItem?.specialty || '';
    navigate(`/patient/specialists?specialty=${encodeURIComponent(specialtyToQuery)}`);
  };

  const activeModalItem = result || selectedHistoryItem;

  const matchedDoctorQuery = trpc.patientDiscovery.list.useQuery(
    { specialty: activeModalItem?.specialty },
    {
      enabled: Boolean(
        activeModalItem?.specialty &&
        activeModalItem.specialty !== 'Emergency Care' &&
        activeModalItem.specialty !== 'Error'
      ),
    }
  );
  const matchedDoctor = matchedDoctorQuery.data?.[0];

  const cardStyle = {
    background: '#E6F9FC',
    padding: 'clamp(16px, 4vw, 28px)',
    borderRadius: '20px',
    border: '1px solid #9FFBFF',
    boxShadow: '0 8px 32px rgba(16, 43, 45, 0.04)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      
      {/* Header */}
      <section style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(0, 196, 204, 0.15)', display: 'grid', placeItems: 'center', color: '#00C4CC', flexShrink: 0 }}>
          <Stethoscope size={24} />
        </div>
        <div>
          <h1 className="font-display" style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: '#102B2D', letterSpacing: '-0.02em', fontFamily: 'Outfit, sans-serif' }}>
            AI Health Assessment
          </h1>
          <p style={{ color: '#2D9D9C', fontSize: '0.9rem', margin: '2px 0 0', fontStyle: 'italic' }}>
            Decision support only. LifeLink does not diagnose, prescribe, or replace professional medical care.
          </p>
        </div>
      </section>

      {/* Assessment Form Card */}
      <Card style={cardStyle}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {apiError && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                background: 'rgba(220, 38, 38, 0.06)',
                border: '1px solid rgba(220, 38, 38, 0.2)',
                borderRadius: '12px',
                color: 'var(--color-semantic-emergency)',
                fontSize: '0.9rem',
              }}
            >
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <span>{apiError}</span>
            </div>
          )}

          {/* Symptoms Input */}
          <label htmlFor="ai-assessment-symptoms" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#102B2D' }}>
              Describe your symptoms <span style={{ color: 'var(--color-semantic-emergency)' }}>*</span>
            </span>
            <textarea 
              id="ai-assessment-symptoms"
              value={symptoms} 
              onChange={(event) => setSymptoms(event.target.value)} 
              placeholder="Describe what you are feeling, when it started, and what makes it better or worse." 
              required 
              rows={4}
              style={{
                width: '100%',
                padding: '14px',
                border: '1px solid #9FFBFF',
                borderRadius: '12px',
                fontSize: '0.92rem',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                background: 'rgba(255, 255, 255, 0.8)',
                color: '#102B2D',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </label>
          
          {/* Grid: Age & Gender */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px' }}>
            <label htmlFor="ai-assessment-age" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#102B2D' }}>
                Age (0 – 120) <span style={{ color: 'var(--color-semantic-emergency)' }}>*</span>
              </span>
              <Input 
                id="ai-assessment-age"
                type="number"
                min={0}
                max={120}
                value={age} 
                onChange={(event) => setAge(event.target.value)} 
                placeholder="e.g. 32"
                required 
                style={{ border: '1px solid #9FFBFF', background: 'rgba(255, 255, 255, 0.8)', color: '#102B2D', borderRadius: '12px' }}
              />
            </label>
            
            <label htmlFor="ai-assessment-gender" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#102B2D' }}>
                Biological Gender <span style={{ color: 'var(--color-semantic-emergency)' }}>*</span>
              </span>
              <select 
                id="ai-assessment-gender"
                aria-label="Biological Gender"
                value={gender} 
                onChange={(event) => setGender(event.target.value)} 
                required 
                style={{
                  height: '42px',
                  padding: '0 12px',
                  border: '1px solid #9FFBFF',
                  borderRadius: '12px',
                  fontSize: '0.92rem',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  background: 'rgba(255, 255, 255, 0.8)',
                  color: '#102B2D',
                  outline: 'none',
                }}
              >
                <option value="" disabled>Select gender</option>
                <option value="Man">Man</option>
                <option value="Woman">Woman</option>
                <option value="Other">Other</option>
              </select>
            </label>
          </div>
          
          {/* Duration & Existing Conditions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px' }}>
            <label htmlFor="ai-assessment-duration" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#102B2D' }}>
                Symptom Duration <span style={{ color: 'var(--color-semantic-emergency)' }}>*</span>
              </span>
              <Input 
                id="ai-assessment-duration"
                type="text" 
                value={duration} 
                onChange={(event) => setDuration(event.target.value)} 
                placeholder="e.g. 2 days, 1 week" 
                required 
                style={{ border: '1px solid #9FFBFF', background: 'rgba(255, 255, 255, 0.8)', color: '#102B2D', borderRadius: '12px' }} 
              />
            </label>
            
            <label htmlFor="ai-assessment-conditions" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#102B2D' }}>
                Existing Conditions <span style={{ color: '#2D9D9C', fontWeight: 400 }}>(optional)</span>
              </span>
              <Input 
                id="ai-assessment-conditions"
                type="text" 
                value={conditions} 
                onChange={(event) => setConditions(event.target.value)} 
                placeholder="e.g. Asthma, Hypertension" 
                style={{ border: '1px solid #9FFBFF', background: 'rgba(255, 255, 255, 0.8)', color: '#102B2D', borderRadius: '12px' }} 
              />
            </label>
          </div>
          
          <Button 
            type="submit" 
            variant="primary" 
            disabled={isProcessing} 
            style={{
              padding: '14px',
              fontSize: '1rem',
              fontWeight: 700,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '12px',
              background: '#00C4CC',
              borderColor: '#00C4CC',
              color: '#FFF',
              marginTop: '8px',
            }}
          >
            {isProcessing ? 'Analyzing symptoms…' : 'Analyse Symptoms'} <Stethoscope size={18} />
          </Button>
        </form>
      </Card>

      {/* Saved Assessment History Section */}
      <section aria-labelledby="saved-assessments-heading" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h2 id="saved-assessments-heading" style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#102B2D', fontFamily: 'Outfit, sans-serif' }}>
            Assessment History
          </h2>
          <p style={{ color: '#2D9D9C', fontSize: '0.85rem', margin: '2px 0 0' }}>
            Persisted triage records from your previous health assessments.
          </p>
        </div>

        {savedAssessments.isLoading ? (
          <p style={{ fontSize: '0.9rem', color: '#2D9D9C', fontStyle: 'italic' }}>Loading your assessment history…</p>
        ) : savedAssessments.data && savedAssessments.data.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '16px' }}>
            {savedAssessments.data.map((item: any) => {
              const badge = urgencyBadgeStyle(item.urgency);
              return (
                <Card 
                  key={item.id} 
                  style={{
                    background: '#E6F9FC',
                    padding: '20px',
                    borderRadius: '16px',
                    border: '1px solid #9FFBFF',
                    boxShadow: '0 4px 16px rgba(16, 43, 45, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.85rem', color: '#2D9D9C', fontWeight: 600 }}>
                      {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '8px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: badge.bg,
                        color: badge.color,
                        border: badge.border,
                      }}
                    >
                      {item.urgency}
                    </span>
                  </div>

                  <div>
                    <strong style={{ fontSize: '0.95rem', color: '#102B2D', display: 'block', fontWeight: 700 }}>
                      {item.specialty}
                    </strong>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#102B2D', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.symptoms}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHistoryItem(item);
                      setIsResultModalOpen(true);
                    }}
                    aria-label={`View triage details for assessment from ${new Date(item.createdAt).toLocaleDateString()}`}
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#00C4CC',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      alignSelf: 'flex-start',
                    }}
                  >
                    View Details <ArrowRight size={12} />
                  </button>
                </Card>
              );
            })}
          </div>
        ) : (
          <p style={{ fontSize: '0.9rem', color: '#2D9D9C', fontStyle: 'italic' }}>
            No saved assessments yet. Completed assessments will automatically appear here.
          </p>
        )}
      </section>

      {/* Result Popup Modal */}
      <Popup 
        isOpen={isResultModalOpen && Boolean(activeModalItem)} 
        onClose={handleCloseResult} 
        title="AI Assessment Triage Result" 
        maxWidth="600px"
      >
        {activeModalItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            
            {/* Emergency Warning Banner if EMERGENCY */}
            {activeModalItem.urgency === 'EMERGENCY' && (
              <div
                style={{
                  padding: '16px',
                  background: 'rgba(220, 38, 38, 0.08)',
                  border: '1px solid rgba(220, 38, 38, 0.25)',
                  borderLeft: '4px solid var(--color-semantic-emergency)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <ShieldAlert size={26} color="var(--color-semantic-emergency)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-semantic-emergency)', margin: '0 0 4px', fontFamily: 'Outfit, sans-serif' }}>
                    Immediate Action Required
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#102B2D' }}>
                    {activeModalItem.guidance}
                  </p>
                </div>
              </div>
            )}

            {/* Urgency Badge & Summary */}
            <div
              style={{
                padding: '16px',
                background: 'rgba(230, 249, 252, 0.6)',
                borderRadius: '12px',
                border: '1px solid #9FFBFF',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2D9D9C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Triage Urgency
                </span>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    ...urgencyBadgeStyle(activeModalItem.urgency),
                  }}
                >
                  {activeModalItem.urgency}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2D9D9C', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '4px' }}>
                  Recommended Specialty
                </span>
                <strong style={{ fontSize: '1rem', color: '#102B2D', fontWeight: 700 }}>
                  {activeModalItem.specialty}
                </strong>
              </div>

              {matchedDoctor && activeModalItem.urgency !== 'EMERGENCY' && activeModalItem.urgency !== 'ERROR' && (
                <div
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(0, 196, 204, 0.08)',
                    border: '1px solid rgba(0, 196, 204, 0.25)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#00C4CC', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>
                      In-System Specialist Available
                    </span>
                    <strong style={{ fontSize: '0.92rem', color: '#102B2D', display: 'block', marginTop: '2px' }}>
                      {matchedDoctor.name}
                    </strong>
                    <span style={{ fontSize: '0.8rem', color: '#2D9D9C', display: 'block', marginTop: '2px' }}>
                      📍 Station: {matchedDoctor.station} ({matchedDoctor.railLine} Line)
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      padding: '6px 12px',
                      background: '#00C4CC',
                      borderColor: '#00C4CC',
                      color: '#FFF',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                    onClick={() => {
                      handleCloseResult();
                      findSpecialist();
                    }}
                  >
                    View & Book
                  </Button>
                </div>
              )}

              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2D9D9C', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '4px' }}>
                  Clinical Reasoning
                </span>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#102B2D', lineHeight: 1.5 }}>
                  {activeModalItem.reason}
                </p>
              </div>

              {activeModalItem.urgency !== 'EMERGENCY' && (
                <div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2D9D9C', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '4px' }}>
                    Non-Diagnostic Guidance
                  </span>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#102B2D', lineHeight: 1.5 }}>
                    {activeModalItem.guidance}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            {activeModalItem.urgency === 'EMERGENCY' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Button 
                  variant="danger" 
                  style={{ width: '100%', borderRadius: '12px', padding: '12px', fontWeight: 700 }} 
                  onClick={() => {
                    handleCloseResult();
                    navigate('/patient/emergency');
                  }}
                >
                  Open Emergency Assistance Workflow
                </Button>
                <Button 
                  variant="outline" 
                  style={{ width: '100%', borderRadius: '12px', borderColor: '#2D9D9C', color: '#2D9D9C' }} 
                  onClick={handleCloseResult}
                >
                  I Understand & Close
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Button 
                  variant="outline" 
                  style={{ flex: 1, borderRadius: '12px', borderColor: '#2D9D9C', color: '#2D9D9C' }} 
                  onClick={handleCloseResult}
                >
                  Close
                </Button>
                <Button 
                  variant="primary" 
                  style={{ flex: 1, borderRadius: '12px', background: '#00C4CC', borderColor: '#00C4CC', color: '#FFF', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} 
                  onClick={() => {
                    handleCloseResult();
                    findSpecialist();
                  }}
                >
                  Find Specialists <ArrowRight size={14} />
                </Button>
              </div>
            )}

          </div>
        )}
      </Popup>

    </div>
  );
};

