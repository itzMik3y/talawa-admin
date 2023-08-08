// mocks.ts
import { gql } from '@apollo/client';
import { ORGANIZATIONS_MEMBER_CONNECTION_LIST } from 'GraphQl/Queries/Queries';
export const ORGANIZATIONS_MEMBER_CONNECTION_LIST_MOCKS = [
  {
    request: {
      query: ORGANIZATIONS_MEMBER_CONNECTION_LIST,
      variables: {
        orgId: 'org1',
        firstName_contains: 'John',
        lastName_contains: 'Doe',
        admin_for: null,
        event_title_contains: null,
      },
    },
    result: {
      data: {
        organizationsMemberConnection: {
          edges: [
            {
              _id: 'user1',
              firstName: 'John',
              lastName: 'Doe',
              image: 'image_url_1',
              email: 'john.doe@example.com',
              createdAt: '2023-01-01T00:00:00Z',
            },
            {
              _id: 'user2',
              firstName: 'Jane',
              lastName: 'Doe',
              image: 'image_url_2',
              email: 'jane.doe@example.com',
              createdAt: '2023-02-01T00:00:00Z',
            },
          ],
        },
      },
    },
  },
  {
    request: {
      query: ORGANIZATIONS_MEMBER_CONNECTION_LIST,
      variables: {
        orgId: 'org1',
        firstName_contains: 'Nonexistent',
        lastName_contains: 'User',
        admin_for: null,
        event_title_contains: null,
      },
    },
    result: {
      data: {
        organizationsMemberConnection: {
          edges: [],
        },
      },
    },
  },
  // Add more mocks as needed.
];
