type EventDateTime =
    | {
          date: string;
          timeZone?: string;
      }
    | {
          dateTime: string;
          timeZone?: string;
      };

type NotionDateTime = {
    start: string;
    end?: string;
};

type googleCalendarDateTime = {
    start: {
        date?: string | null;
        dateTime?: string | null;
        timeZone?: string;
    };
    end: {
        date?: string | null;
        dateTime?: string | null;
        timeZone?: string;
    };
};

/**
 * 캘린더 간 이벤트를 동기화하기 위한 클래스입니다.
 * 모든 이벤트는 이 클래스로 변환된 다음 대상 클래스로 변경해야 합니다.
 */
export class Event {
    eventId?: string;
    calendarId?: string;
    googleCalendarEventId?: string;
    googleCalendarId?: string;
    notionPageId?: string;

    eventSource?: 'notion' | 'googleCalendar';
    status: 'confirmed' | 'tentative' | 'cancelled';

    title?: string;
    start?: EventDateTime;
    end?: EventDateTime;
}
