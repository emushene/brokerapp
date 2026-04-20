using AutoMapper;
using brokerApp.API.DTOs;
using brokerApp.API.Models;

namespace brokerApp.API.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<SubmissionCreateDto, Submission>();
        CreateMap<Submission, SubmissionResponseDto>();
    }
}