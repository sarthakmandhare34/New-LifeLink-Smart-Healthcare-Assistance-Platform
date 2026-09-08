import { describe, expect, it } from "vitest";
import { publishDoctorEvent, publishPatientEvent, subscribeToDoctorEvents, subscribeToPatientEvents } from "./eventBus";
import { parseLastEventId } from "./patientRealtime";

describe("patient realtime isolation", () => {
  it("only delivers an event to the matching patient channel", () => {
    const firstPatientEvents: number[] = [];
    const secondPatientEvents: number[] = [];
    const stopFirst = subscribeToPatientEvents(1, (event) => firstPatientEvents.push(event.id));
    const stopSecond = subscribeToPatientEvents(2, (event) => secondPatientEvents.push(event.id));

    publishPatientEvent({ id: 55, userId: 1, type: "MEDICINE_UPDATED", entityId: "7", createdAt: new Date() });

    stopFirst();
    stopSecond();
    expect(firstPatientEvents).toEqual([55]);
    expect(secondPatientEvents).toEqual([]);
  });

  it("accepts only positive integral event resume identifiers", () => {
    expect(parseLastEventId("42")).toBe(42);
    expect(parseLastEventId("0")).toBeUndefined();
    expect(parseLastEventId("not-an-id")).toBeUndefined();
  });

  it("only delivers a doctor event to the matching controlled synthetic doctor channel", () => {
    const primaryDoctorEvents: number[] = [];
    const otherDoctorEvents: number[] = [];
    const stopPrimary = subscribeToDoctorEvents("mock-central-cardiology-csmt", (event) => primaryDoctorEvents.push(event.id));
    const stopOther = subscribeToDoctorEvents("mock-western-general-practice-churchgate", (event) => otherDoctorEvents.push(event.id));

    publishDoctorEvent({ id: 72, doctorId: "mock-central-cardiology-csmt", patientUserId: 9, type: "APPOINTMENT_UPDATED", entityId: "22", createdAt: new Date() });

    stopPrimary();
    stopOther();
    expect(primaryDoctorEvents).toEqual([72]);
    expect(otherDoctorEvents).toEqual([]);
  });
});
