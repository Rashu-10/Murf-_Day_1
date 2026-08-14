import json
import pytest
from livekit.agents import AgentSession, llm
from livekit.plugins import google

from agent import Assistant, ClinicAppointmentSpecialist


def _llm() -> llm.LLM:
    return google.LLM(model="gemini-3.5-flash-lite")


@pytest.mark.asyncio
async def test_normal_question_stays_with_main_agent() -> None:
    """Test that a general wellness query is answered directly by the main agent without handoff."""
    async with (
        _llm() as llm_inst,
        AgentSession(llm=llm_inst) as session,
    ):
        await session.start(Assistant())

        result = await session.run(
            user_input="What are some tips for maintaining good sleep hygiene?"
        )

        # Assert no handoff tool was called
        assert session.current_agent.__class__.__name__ == "Assistant"
        await (
            result.expect.next_event()
            .is_message(role="assistant")
            .judge(
                llm_inst,
                intent="Provides general sleep hygiene tips in a friendly and helpful manner.",
            )
        )
        result.expect.no_more_events()


@pytest.mark.asyncio
async def test_specialist_handoff_on_appointment_request() -> None:
    """Test that an appointment booking query triggers transfer_to_clinic_specialist tool and updates the session agent."""
    async with (
        _llm() as llm_inst,
        AgentSession(llm=llm_inst) as session,
    ):
        await session.start(Assistant())

        result = await session.run(
            user_input="I need to book a clinic appointment with a doctor for tomorrow morning."
        )

        # Assert transfer_to_clinic_specialist function was invoked
        result.expect.contains_function_call(name="transfer_to_clinic_specialist")

        # Verify active agent switched to ClinicAppointmentSpecialist
        assert session.current_agent.__class__.__name__ == "ClinicAppointmentSpecialist"


@pytest.mark.asyncio
async def test_specialist_slot_and_booking_tools() -> None:
    """Test ClinicAppointmentSpecialist get_available_slots and book_appointment tools directly."""
    specialist = ClinicAppointmentSpecialist()

    class DummyContext:
        pass

    ctx = DummyContext()

    # Test slot lookup
    slots_str = await specialist.get_available_slots(ctx, "Urban Health Centre, Bandra", "General Physician")
    slots_data = json.loads(slots_str)
    assert "available_slots" in slots_data
    assert len(slots_data["available_slots"]) > 0

    # Test booking
    booking_str = await specialist.book_appointment(
        ctx,
        patient_name="Ramesh Kumar",
        clinic_name="Urban Health Centre, Bandra",
        doctor_name="Dr. Priya Sharma",
        slot_time="10:00 AM Tomorrow",
        reason_for_visit="Routine Health Checkup"
    )
    booking_data = json.loads(booking_str)
    assert booking_data["status"] == "confirmed"
    assert booking_data["appointment_id"].startswith("APT-")
    assert booking_data["patient_name"] == "Ramesh Kumar"


@pytest.mark.asyncio
async def test_specialist_handback_to_main_agent() -> None:
    """Test handback from ClinicAppointmentSpecialist to Assistant."""
    async with (
        _llm() as llm_inst,
        AgentSession(llm=llm_inst) as session,
    ):
        specialist = ClinicAppointmentSpecialist()
        await session.start(specialist)

        # Initial agent is specialist
        assert session.current_agent.__class__.__name__ == "ClinicAppointmentSpecialist"

        result = await session.run(
            user_input="Actually, I don't need an appointment anymore. Can you give me general diet advice?"
        )

        # Assert handback tool was called
        result.expect.contains_function_call(name="transfer_to_main_agent")

        # Verify active agent switched back to Assistant
        assert session.current_agent.__class__.__name__ == "Assistant"
