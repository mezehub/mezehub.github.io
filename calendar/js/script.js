document.addEventListener('DOMContentLoaded', function () {
    const calendarEl = document.getElementById('calendar');
    const timezoneSelect = document.getElementById('timezone');
    const timezoneButton = document.getElementById('timezoneButton');
    const timezoneContainer = document.getElementById('timezoneContainer');

    let eventList = [];
    let originalEvents = [];
    let currentTimezone = 'CET';
    let calendar;

    timezoneButton.addEventListener('click', function() {
        timezoneContainer.classList.toggle('active');
        timezoneButton.style.display = timezoneContainer.classList.contains('active') ? 'none' : 'block';
    });

    async function fetchEvents() {
        const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vTdJN88ly1PXVRE_34BdmoBl3loB9FiJWdWTeS8_ZQiGrJc-gIABBw9K0fvv1VwOw9vwnWoInc_eAay/pub?gid=0&single=true&output=csv');
        const text = await response.text();
        const data = Papa.parse(text, { header: true, skipEmptyLines: true }).data;

        return data.map(row => ({
            id: row['id'] || row['title'] + row['start'],
            title: row['title'],
            start: moment.tz(row['start'], 'YYYY-MM-DDTHH:mm:ss', 'CET').toDate(),
            end: moment.tz(row['end'], 'YYYY-MM-DDTHH:mm:ss', 'CET').toDate(),
            description: row['description']
        }));
    }

    function updateEventTimes(events, targetTimezone) {
        return events.map(event => {
            const updatedEvent = { ...event };
            updatedEvent.start = moment.tz(event.start, 'CET').tz(targetTimezone).toDate();
            updatedEvent.end = moment.tz(event.end, 'CET').tz(targetTimezone).toDate();
            return updatedEvent;
        });
    }

    function initTimezoneSelector() {
        const timezones = moment.tz.names();

        const cetOption = new Option('CET', 'CET', true, true);
        timezoneSelect.add(cetOption);

        timezones.forEach(tz => {
            if (tz !== 'CET') {
                const option = new Option(tz, tz);
                timezoneSelect.add(option);
            }
        });

        new TomSelect(timezoneSelect, {
            maxOptions: null
        });

        timezoneSelect.addEventListener('change', function () {
            currentTimezone = this.value;
            updateCalendarEvents();
        });
    }

    function updateCalendarEvents() {
        const updatedEvents = updateEventTimes(originalEvents, currentTimezone);
        const currentView = calendar.view.type;
        const currentDate = calendar.getDate();

        initCalendar(updatedEvents);

        calendar.changeView(currentView, currentDate);
        updateCurrentEvents();
        updateUpcomingEvents();
    }

    function initCalendar(events) {
        eventList = events.map(event => ({
            ...event,
            start: new Date(event.start),
            end: new Date(event.end)
        }));

        if (calendar) {
            calendar.destroy();
        }

        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,listWeek'
            },
            events: eventList,
            allDayText: '',
            eventClick: function (info) {
                openModal(info.event);
            },
            eventContent: function (arg) {
                return {
                    html: `<div class="fc-event-title" style="background-color: #7030a0; color: #fff; padding: 2px 5px; border-radius: 3px; border: 1px solid #7030a0;">${arg.event.title}</div>`
                };
            }
        });

        calendar.render();
    }

    function openModal(event) {
        if (event && event.start && event.end) {
            const eventDate = moment.tz(event.start, currentTimezone).format('YYYY-MM-DD');
            eventsOfTheDay = eventList.filter(e => moment.tz(e.start, currentTimezone).format('YYYY-MM-DD') === eventDate);
            currentEventIndex = eventsOfTheDay.findIndex(e => e.id === event.id);

            updateModalContent(eventsOfTheDay[currentEventIndex]);
            document.getElementById('eventModal').style.display = 'block';
        } else {
            console.error('Invalid event object:', event);
        }
    }

    function closeModal() {
        document.getElementById('eventModal').style.display = 'none';
    }

    function prevEvent() {
        currentEventIndex = (currentEventIndex - 1 + eventsOfTheDay.length) % eventsOfTheDay.length;
        updateModalContent(eventsOfTheDay[currentEventIndex]);
    }

    function nextEvent() {
        currentEventIndex = (currentEventIndex + 1) % eventsOfTheDay.length;
        updateModalContent(eventsOfTheDay[currentEventIndex]);
    }

    function updateModalContent(event) {
        if (event && event.start && event.end) {
            const startDate = moment.tz(event.start, currentTimezone).format('DD-MM-YYYY');
            const endDate = moment.tz(event.end, currentTimezone).format('DD-MM-YYYY');
            const startTime = moment.tz(event.start, currentTimezone).format('hh:mm A');
            const endTime = moment.tz(event.end, currentTimezone).format('hh:mm A');
            document.getElementById('eventDate').innerText = `Events on ${moment.tz(event.start, currentTimezone).format('YYYY-MM-DD')}`;
            document.getElementById('modalTitle').innerText = event.title || 'No Title';
            document.getElementById('modalDescription').innerText = `Description: ${event.description || 'No Description'}`;
            document.getElementById('modalDate').innerText = `Date: ${startDate} - ${endDate}`;
            document.getElementById('modalTime').innerText = `Time: ${startTime} - ${endTime}`;
        } else {
            console.error('Invalid event object:', event);
            document.getElementById('eventDate').innerText = 'No Event';
            document.getElementById('modalTitle').innerText = 'No Title';
            document.getElementById('modalDescription').innerText = 'No Description';
            document.getElementById('modalTime').innerText = 'No Time';
        }
    }

    function updateCurrentEvents() {
        const now = moment().tz(currentTimezone);
        const currentEvents = eventList.filter(event => {
            const eventStart = moment.tz(event.start, currentTimezone);
            const eventEnd = moment.tz(event.end, currentTimezone);
            return eventStart <= now && now < eventEnd;
        });
    
        const currentEventContainer = document.getElementById('currentEvent');
        currentEventContainer.innerHTML = '<h2>Current Event</h2>';
    
        if (currentEvents.length > 0) {
            currentEvents.forEach((event, index) => {
                const startDate = moment.tz(event.start, currentTimezone).format('DD-MM-YYYY');
                const endDate = moment.tz(event.end, currentTimezone).format('DD-MM-YYYY');
                const startTime = moment.tz(event.start, currentTimezone).format('hh:mm A');
                const endTime = moment.tz(event.end, currentTimezone).format('hh:mm A');
                currentEventContainer.innerHTML += `
                    <p><strong>Title:</strong> ${event.title || 'No current event'}</p>
                    <p><strong>Description:</strong> ${event.description || 'N/A'}</p>
                    <p><strong>Date:</strong> ${startDate} - ${endDate}</p>
                    <p><strong>Time:</strong> ${startTime} - ${endTime}</p>
                    <p><strong>Ends in:</strong> <span id="currentEventEndsIn${index}"></span></p>
                    ${index < currentEvents.length - 1 ? '<hr>' : ''}`;
                
                updateCurrentEventCountdown(event, index);
            });
        } else {
            currentEventContainer.innerHTML += `
                <p><strong>Title:</strong> No current event</p>
                <p><strong>Description:</strong> N/A</p>
                <p><strong>Date:</strong> N/A</p>
                <p><strong>Time:</strong> N/A</p>
                <p><strong>Ends in:</strong> N/A</p>`;
        }
    }
    
    function updateCurrentEventCountdown(event, index) {
        const now = moment().tz(currentTimezone);
        const eventEnd = moment.tz(event.end, currentTimezone);
        const duration = moment.duration(eventEnd.diff(now));
    
        const hours = Math.floor(duration.asHours());
        const minutes = Math.floor(duration.minutes());
        const seconds = Math.floor(duration.seconds());
    
        document.getElementById(`currentEventEndsIn${index}`).innerText = `${hours}h ${minutes}m ${seconds}s`;
    
        if (duration.asSeconds() > 0) {
            setTimeout(() => updateCurrentEventCountdown(event, index), 1000);
        }
    }
    
    function updateUpcomingEvents() {
        const now = moment().tz(currentTimezone);
        const upcomingEvents = eventList.filter(event => moment.tz(event.start, currentTimezone).isAfter(now));
        upcomingEvents.sort((a, b) => moment.tz(a.start, currentTimezone).diff(moment.tz(b.start, currentTimezone)));
    
        console.log('Upcoming events:', upcomingEvents); // Debug log
    
        updateUpcomingEventItems(upcomingEvents.slice(0, 2));
    }
    
    function updateUpcomingEventItems(events) {
        console.log('Updating upcoming event items:', events); // Debug log
    
        for (let i = 1; i <= 2; i++) {
            const event = events[i - 1];
            updateUpcomingEventItem(event, i);
        }
    }
    
    function updateUpcomingEventItem(event, index) {
        console.log(`Updating upcoming event item ${index}:`, event); // Debug log
    
        if (event) {
            const startDateTime = moment.tz(event.start, currentTimezone).format('DD-MM-YYYY');
            const endDateTime = moment.tz(event.end, currentTimezone).format('DD-MM-YYYY');
            const startTime = moment.tz(event.start, currentTimezone).format('hh:mm A');
            const endTime = moment.tz(event.end, currentTimezone).format('hh:mm A');
     
            updateCountdown(event, index);
     
            document.getElementById(`upcomingEventTitle${index}`).textContent = event.title || 'No upcoming event';
            document.getElementById(`upcomingEventDescription${index}`).textContent = event.description || 'N/A';
            document.getElementById(`upcomingEventTime${index}`).textContent = `${startTime} - ${endTime}`;
            document.getElementById(`upcomingEventDate${index}`).textContent = `${startDateTime} - ${endDateTime}`;
        } else {
            document.getElementById(`upcomingEventTitle${index}`).textContent = 'No upcoming event';
            document.getElementById(`upcomingEventDescription${index}`).textContent = 'N/A';
            document.getElementById(`upcomingEventTime${index}`).textContent = 'N/A';
            document.getElementById(`upcomingEventDate${index}`).textContent = 'N/A';
            document.getElementById(`upcomingEventCountdown${index}`).textContent = 'N/A';
        }
    }
    function updateCountdown(event, index) {
        const now = moment().tz(currentTimezone);
        const eventStart = moment.tz(event.start, currentTimezone);
        const duration = moment.duration(eventStart.diff(now));

        const hours = Math.floor(duration.asHours());
        const minutes = Math.floor(duration.minutes());
        const seconds = Math.floor(duration.seconds());

        document.getElementById(`upcomingEventCountdown${index}`).innerText = `${hours}h ${minutes}m ${seconds}s`;

        setTimeout(() => updateCountdown(event, index), 1000);
    }

    fetchEvents().then(events => {
        originalEvents = events;
        const updatedEvents = updateEventTimes(events, currentTimezone);
        initCalendar(updatedEvents);
        initTimezoneSelector();
        updateCurrentEvents();
        updateUpcomingEvents();
    });

    window.closeModal = closeModal;
    window.prevEvent = prevEvent;
    window.nextEvent = nextEvent;

    setInterval(updateCurrentEvents, 60000);
    setInterval(updateUpcomingEvents, 60000);
});
