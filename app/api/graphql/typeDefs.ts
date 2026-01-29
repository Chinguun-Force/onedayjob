export const typeDefs = `#graphql
  enum Role {
    ADMIN
    EMPLOYEE
  }

  type User {
    id: ID!
    email: String!
    name: String
    role: Role!
  }

  enum NotificationType {
    PROFILE_UPDATED
    NEW_EMPLOYEE_ADDED
  }

  type NotificationTemplate {
    id: ID!
    type: NotificationType!
    title: String!
    body: String!
    createdAt: String!
    updatedAt: String!
  }

  input UpsertTemplateInput {
    type: NotificationType!
    title: String!
    body: String!
  }

  type Query {
    me: User
    users: [User!]!

    templates: [NotificationTemplate!]!
    template(type: NotificationType!): NotificationTemplate
  }

  type Mutation {
    upsertTemplate(input: UpsertTemplateInput!): NotificationTemplate!
    deleteTemplate(type: NotificationType!): Boolean!
  }
`;
