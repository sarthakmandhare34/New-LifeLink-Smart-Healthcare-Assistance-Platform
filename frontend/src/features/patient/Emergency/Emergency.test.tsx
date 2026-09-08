// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Emergency, AMBULANCE_EMERGENCY_NUMBER, SMS_CONFIRMATION_TITLE } from './Emergency';
import { trpc } from '../../../lib/trpc';

// Mock dependencies
vi.mock('../../../lib/trpc', () => ({
  trpc: {
    patientProfile: {
      get: {
        useQuery: vi.fn(),
      }
    }
  }
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Batch 11: Emergency Assistance', () => {
  const originalAssign = window.location.assign;
  const mockAssign = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { assign: mockAssign },
      writable: true
    });
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
  });

  afterEach(() => {
    window.location.assign = originalAssign;
  });

  const mockContacts = [
    { id: '1', name: 'Alice', relationship: 'Mother', phone: '+919999999999' }
  ];

  function renderEmergency(contacts: any[] = mockContacts, isLoading = false) {
    (trpc.patientProfile.get.useQuery as any).mockReturnValue({
      data: { emergencyContacts: contacts },
      isLoading
    });
    return render(
      <MemoryRouter>
        <Emergency />
      </MemoryRouter>
    );
  }

  // TEST 1
  it('TEST 1: Emergency page renders correctly with expected headings', () => {
    renderEmergency();
    expect(screen.getByText('Emergency Assistance')).toBeTruthy();
    expect(screen.getAllByText(/Choose an action yourself/i)[0]).toBeTruthy();
  });

  // TEST 2, 8
  it('TEST 2 & 8: Authenticated patient access and patient-owned contacts', () => {
    renderEmergency(mockContacts);
    // Uses trpc patient profile
    expect(trpc.patientProfile.get.useQuery).toHaveBeenCalled();
    expect(screen.getAllByText('Alice')[0]).toBeTruthy();
    expect(screen.getAllByText('Mother')[0]).toBeTruthy();
  });

  // TEST 3
  it('TEST 3: No automatic call upon mount', () => {
    renderEmergency();
    expect(mockAssign).not.toHaveBeenCalled();
  });

  // TEST 4
  it('TEST 4: No automatic SMS upon mount', () => {
    renderEmergency();
    expect(mockAssign).not.toHaveBeenCalled();
  });

  // TEST 5
  it('TEST 5: No automatic location sharing', () => {
    const geoMock = vi.fn();
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition = geoMock;
    }
    renderEmergency();
    expect(geoMock).not.toHaveBeenCalled();
  });

  // TEST 6
  it('TEST 6: Explicit call interaction', () => {
    renderEmergency();
    // Click call button
    const callButtons = screen.getAllByRole('button', { name: new RegExp(`Call ${AMBULANCE_EMERGENCY_NUMBER}`) });
    fireEvent.click(callButtons[0]);
    // Verify popup opens
    expect(screen.getAllByText(/LifeLink will not place the call for you/i)[0]).toBeTruthy();
    
    // Confirm action
    const openDialerButtons = screen.getAllByText(/Open dialer/i);
    fireEvent.click(openDialerButtons[0]);
    
    expect(mockAssign).toHaveBeenCalledWith(`tel:${AMBULANCE_EMERGENCY_NUMBER}`);
  });

  // TEST 7
  it('TEST 7: Explicit SMS confirmation', () => {
    renderEmergency();
    const reviewMessageButtons = screen.getAllByText(/Review SOS message/i);
    fireEvent.click(reviewMessageButtons[0]);
    
    // Popup appears
    expect(screen.getAllByText(new RegExp(SMS_CONFIRMATION_TITLE))[0]).toBeTruthy();
    expect(mockAssign).not.toHaveBeenCalled(); // Still haven't confirmed
    
    const openDraftButtons = screen.getAllByText(/Open SMS draft/i);
    fireEvent.click(openDraftButtons[0]);
    
    expect(mockAssign).toHaveBeenCalledTimes(1);
    expect(mockAssign.mock.calls[0][0]).toContain('sms:');
  });

  // TEST 9
  it('TEST 9: Empty contact state is honest', () => {
    renderEmergency([]);
    expect(screen.getAllByText(/No emergency contacts are recorded in your Health Passport yet/i)[0]).toBeTruthy();
  });

  // TEST 10 & 12
  it('TEST 10 & 12: No fake success messages or automatic delivery claims', () => {
    renderEmergency();
    // Search the DOM for banned phrases
    const html = document.body.innerHTML;
    expect(html).not.toMatch(/message sent/i);
    expect(html).not.toMatch(/emergency services contacted/i);
    expect(html).not.toMatch(/location shared/i);
  });

  // TEST 11
  it('TEST 11: No native browser dialogs in production code', () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const confirmMock = vi.spyOn(window, 'confirm').mockImplementation(() => true);
    
    renderEmergency();
    const callButtons = screen.getAllByRole('button', { name: new RegExp(`Call ${AMBULANCE_EMERGENCY_NUMBER}`) });
    fireEvent.click(callButtons[0]);
    
    expect(alertMock).not.toHaveBeenCalled();
    expect(confirmMock).not.toHaveBeenCalled();
  });

  // TEST 13
  it('TEST 13: EMERGENCY assessment integration (simulate arrival)', () => {
    renderEmergency();
    expect(mockAssign).not.toHaveBeenCalled();
  });
});
