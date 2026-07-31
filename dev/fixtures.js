export const notificationFixtures = [
  {
    id: 101,
    notification_id: 501,
    notification_type: 'case.updated',
    content: { title_key: 'harness.caseUpdated', body_key: 'harness.caseUpdatedBody' },
    created_at: '2026-07-31T09:00:00Z',
    seen_at: null,
  },
  {
    id: 102,
    notification_id: 502,
    notification_type: 'case.assigned',
    content: { title_key: 'harness.caseAssigned', body_key: 'harness.caseAssignedBody' },
    created_at: '2026-07-30T12:00:00Z',
    seen_at: '2026-07-30T12:05:00Z',
  },
];

export const barChartFixture = {
  series: [
    { data: [24, 36, 28, 52], label: 'Opened' },
    { data: [18, 29, 31, 44], label: 'Resolved' },
  ],
  xAxis: [{ data: ['Apr', 'May', 'Jun', 'Jul'] }],
};
