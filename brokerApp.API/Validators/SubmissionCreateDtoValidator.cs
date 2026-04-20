using FluentValidation;
using brokerApp.API.DTOs;

namespace brokerApp.API.Validators;

public class SubmissionCreateDtoValidator : AbstractValidator<SubmissionCreateDto>
{
    public SubmissionCreateDtoValidator()
    {
        RuleFor(x => x.ApplicantSurname).NotEmpty();
        RuleFor(x => x.Initials).NotEmpty();
        
        RuleFor(x => x.IdNumber)
            .NotEmpty()
            .Matches(@"^\d{13}$").WithMessage("ID Number must be exactly 13 digits.");

        RuleFor(x => x.Premium).GreaterThan(0);
        RuleFor(x => x.SalaryRefNo).NotEmpty();
        
        RuleFor(x => x.ApplicantPhoneNumber)
            .NotEmpty()
            .MinimumLength(10).WithMessage("Phone number must be at least 10 digits.")
            .Matches(@"^[0-9+() -]*$").WithMessage("Invalid phone number format.");

        RuleFor(x => x.Date).NotEmpty();
        RuleFor(x => x.IntermediaryName).NotEmpty();
        RuleFor(x => x.IntermediaryCode).NotEmpty();
    }
}