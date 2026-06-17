using AutoMapper;
using brokerApp.API.DTOs;
using brokerApp.API.Models;

namespace brokerApp.API.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<SubmissionCreateDto, Submission>()
            .ForMember(dest => dest.Advisors, opt => opt.Ignore()); // Handled in Service
        
        CreateMap<Submission, SubmissionResponseDto>()
            .ForMember(dest => dest.Type, opt => opt.MapFrom(src => src.Type.ToString()))
            .ForMember(dest => dest.Method, opt => opt.MapFrom(src => src.Method.ToString()))
            .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()))
            .ForMember(dest => dest.AdvisorGroupName, opt => opt.MapFrom(src => src.AdvisorGroup != null ? src.AdvisorGroup.Name : null));
            
        CreateMap<Advisor, AdvisorDto>();
        CreateMap<AdvisorDto, Advisor>();

        CreateMap<AdvisorGroup, AdvisorGroupDto>()
            .ForMember(dest => dest.MemberIds, opt => opt.MapFrom(src => src.Members.Select(m => m.Id)));

        CreateMap<SubmissionDocument, SubmissionDocumentDto>();

        CreateMap<AccountAdjustment, AccountAdjustmentDto>()
            .ForMember(dest => dest.Type, opt => opt.MapFrom(src => (int)src.Type))
            .ForMember(dest => dest.Status, opt => opt.MapFrom(src => (int)src.Status))
            .ForMember(dest => dest.AdvisorName, opt => opt.MapFrom(src => src.Advisor != null ? src.Advisor.Name : null))
            .ForMember(dest => dest.AdvisorGroupName, opt => opt.MapFrom(src => src.AdvisorGroup != null ? src.AdvisorGroup.Name : null))
            .ForMember(dest => dest.PromotionalItemName, opt => opt.MapFrom(src => src.PromotionalItem != null ? src.PromotionalItem.Name : null));

        CreateMap<AdvisorCommission, CommissionResponseDto>()
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id))
            .ForMember(dest => dest.PolicyPaymentId, opt => opt.MapFrom(src => src.PolicyPaymentId))
            .ForMember(dest => dest.AdvisorId, opt => opt.MapFrom(src => src.AdvisorId))
            .ForMember(dest => dest.CommissionAmount, opt => opt.MapFrom(src => src.CommissionAmount))
            .ForMember(dest => dest.DateCalculated, opt => opt.MapFrom(src => src.DateCalculated))
            .ForMember(dest => dest.AmountReceived, opt => opt.MapFrom(src => src.PolicyPayment != null ? src.PolicyPayment.AmountReceived : 0))
            .ForMember(dest => dest.Reference, opt => opt.MapFrom(src => src.PolicyPayment != null ? src.PolicyPayment.Reference : src.PayoutReference))
            .ForMember(dest => dest.AdvisorName, opt => opt.MapFrom(src => src.Advisor.Name))
            .ForMember(dest => dest.ApplicantSurname, opt => opt.MapFrom(src => src.Submission != null ? src.Submission.ApplicantSurname : ""))
            .ForMember(dest => dest.ApplicantInitials, opt => opt.MapFrom(src => src.Submission != null ? src.Submission.Initials : ""))
            .ForMember(dest => dest.IsPaid, opt => opt.MapFrom(src => src.IsPaid))
            .ForMember(dest => dest.DatePaid, opt => opt.MapFrom(src => src.DatePaid))
            .ForMember(dest => dest.PayoutReference, opt => opt.MapFrom(src => src.PayoutReference))
            .ForMember(dest => dest.FileUrl, opt => opt.MapFrom(src => 
                src.Submission != null && src.Submission.Documents.Any() 
                ? src.Submission.Documents.OrderByDescending(d => d.DateModified).First().FileUrl 
                : null));
    }
}
