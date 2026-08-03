using brokerApp.API.Models;

namespace brokerApp.API.DTOs;

public class AdvancesGiftsReportDto
{
    public ReportSummaryDto Summary { get; set; } = new();
    public List<AdvisorDebtSummaryDto> Advisors { get; set; } = new();
    public List<TeamDebtSummaryDto> Teams { get; set; } = new();
    public List<AccountAdjustmentDto> Adjustments { get; set; } = new();

    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public int TotalAdvisors { get; set; }
    public int TotalTeams { get; set; }
    public int TotalAdjustments { get; set; }
}


public class ReportSummaryDto
{
    public decimal TotalAdvancesOwed { get; set; }
    public decimal TotalGiftsOwed { get; set; }
    public decimal TotalOtherOwed { get; set; }
    public decimal GrandTotalOwed { get; set; }
    public int ActiveDebtorAdvisorsCount { get; set; }
    public int ActiveDebtorTeamsCount { get; set; }
    public int TotalActiveAdjustmentsCount { get; set; }
}

public class AdvisorDebtSummaryDto
{
    public int AdvisorId { get; set; }
    public string AdvisorName { get; set; } = string.Empty;
    public string AdvisorCode { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int? AdvisorGroupId { get; set; }
    public string? AdvisorGroupName { get; set; }
    public decimal AdvancesOwed { get; set; }
    public decimal GiftsOwed { get; set; }
    public decimal OtherOwed { get; set; }
    public decimal TotalOwed { get; set; }
    public decimal TotalInitialAdvances { get; set; }
    public decimal TotalInitialGifts { get; set; }
    public int ActiveAdjustmentsCount { get; set; }
}

public class TeamDebtSummaryDto
{
    public int GroupId { get; set; }
    public string GroupName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal DirectGroupAdvancesOwed { get; set; }
    public decimal DirectGroupGiftsOwed { get; set; }
    public decimal DirectGroupOtherOwed { get; set; }
    public decimal MembersAdvancesOwed { get; set; }
    public decimal MembersGiftsOwed { get; set; }
    public decimal TotalTeamOwed { get; set; }
    public int MemberCount { get; set; }
    public List<AdvisorDebtSummaryDto> Members { get; set; } = new();
}
