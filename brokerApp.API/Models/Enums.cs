namespace brokerApp.API.Models;

public enum AdjustmentType
{
    Advance,
    PromotionalItem,
    Damage,
    Maintenance,
    EventFee,
    Other
}

public enum AdjustmentStatus
{
    Pending,
    PartiallyPaid,
    Cleared
}
