export const getMockState = (householdId: string) => ({
  householdId,
  isVolunteer: false,
  currentPhase: 'initial' as const,
  allowance: {
    baseAllowance: 2,
    volunteerBonus: 0,
    secondWaveBonus: 0,
    totalAllowance: 2,
    isVolunteer: false,
    isSecondWave: false,
    maxAllowed: 2
  },
  nightStates: [],
  availableEvents: [
    {
      key: 'tue-530',
      name: 'Tuesday 5:30 PM',
      date: '2025-10-28',
      time: '17:30',
      isAvailable: true,
      night: 'tue'
    },
    {
      key: 'tue-630',
      name: 'Tuesday 6:30 PM',
      date: '2025-10-28',
      time: '18:30',
      isAvailable: true,
      night: 'tue'
    },
    {
      key: 'thu-530',
      name: 'Thursday 5:30 PM',
      date: '2025-10-30',
      time: '17:30',
      isAvailable: true,
      night: 'thu'
    },
    {
      key: 'thu-630',
      name: 'Thursday 6:30 PM',
      date: '2025-10-30',
      time: '18:30',
      isAvailable: true,
      night: 'thu'
    }
  ]
});

export const getMockSprouterUrls = () => ({
  'tue-530': 'https://proposal.xraypayment.com/embed/tue-530',
  'tue-630': 'https://proposal.xraypayment.com/embed/tue-630',
  'thu-530': 'https://proposal.xraypayment.com/embed/thu-530',
  'thu-630': 'https://proposal.xraypayment.com/embed/thu-630',
});

export const getMockPurchases = () => [
  {
    id: 'purchase_1',
    eventKey: 'tue-530',
    eventName: 'Tuesday 5:30 PM',
    eventDate: '2025-10-28',
    eventTime: '5:30 PM',
    ticketsRequested: 1,
    status: 'pending' as const,
    purchaseDate: new Date().toISOString(),
    sprouterUrl: 'https://proposal.xraypayment.com/embed/tue-530'
  }
];
