export type NotionPropType =
    | 'title'
    | 'select'
    | 'date'
    | 'checkbox'
    | 'url'
    | 'rich_text'
    | 'last_edited_by';

/**
 * 필수 속성입니다.
 */
export const REQUIRED_NOTION_PROPS = [
    'title',
    'calendar',
    'date',
    'delete',
    'link',
    'last_edited_by',
] as const;

/**
 * 추가적인 속성입니다.
 */
export const ADDITIONAL_NOTION_PROPS = ['location', 'description'] as const;

/**
 * 노션에 추가 가능한 (복구 가능한) 속성입니다.
 */
export const ADDABLE_NOTION_PROPS = [
    'delete',
    'last_edited_by',
    'link',
    'location',
    'description',
] as const;

export const NOTION_PROPS_TYPE_MAP: Record<
    (typeof REQUIRED_NOTION_PROPS | typeof ADDITIONAL_NOTION_PROPS)[number],
    NotionPropType
> = {
    title: 'title',
    calendar: 'select',
    date: 'date',
    delete: 'checkbox',
    link: 'url',
    description: 'rich_text',
    location: 'rich_text',
    last_edited_by: 'last_edited_by',
} as const;

export const ADDABLE_PROPS_TYPE_MAP: Record<
    (typeof ADDABLE_NOTION_PROPS)[number],
    'checkbox' | 'last_edited_by' | 'url' | 'rich_text'
> = {
    delete: 'checkbox',
    last_edited_by: 'last_edited_by',
    description: 'rich_text',
    link: 'url',
    location: 'rich_text',
} as const;
