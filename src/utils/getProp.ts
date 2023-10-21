import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

function isPropType<T extends PageObjectResponse['properties'][string]['type']>(
    obj: PageObjectResponse['properties'][string],
    type: T,
): obj is Extract<PageObjectResponse['properties'][string], { type: T }> {
    return obj.type === type;
}

export const getProp = <
    T extends PageObjectResponse['properties'][string]['type'] = 'title',
>(
    page: PageObjectResponse,
    propId: string,
    type: T,
) => {
    const prop = Object.values(page.properties).find((e) => e.id === propId);
    if (isPropType(prop, type)) {
        return prop;
    } else {
        throw new Error(
            `Property ${propId} is not of type ${type}, but ${prop?.type}`,
        );
    }
};
