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
            .ForMember(dest => dest.Type, opt => opt.MapFrom(src => src.Type.ToString()));
            
        CreateMap<Advisor, AdvisorDto>();
    }
}