function [ ] = GetWMf( name )
% Function that first applies the Peirce criterion to a set of data and
% then compute a MSWD-weighted mean out of filtered dataset

% Input : measured data. Must be 2 columns, n lines of measurement (column 1) with associated
% individual uncertainties at 1 sigma (column 2)
% Filter: 0 no tiltering
%          1 apply Peirce filtering

% Wstdval: 0 : compute error as a error associated to the weighted mean
%          1 : compute also the weighted standard deviation, compare with error associated to the weighted mean
%               and return the biggest

% Output:
% WM: New weighted mean
% Err: New weighted standard deviation
disp("inside getwmf")
disp(name)

% Open paths and load data
addpath Functions
addpath Constants
addpath jsonlab

% Retreive json file
Data=loadjson(name);
% Name=fieldnames(Data);
% Data=getfield(Data,Name{1});

% Load values
PRval=Data.PRval;
PRerr=Data.PRerr;
Filter=Data.Filter;
Wstdval=Data.Wstdval;

if length(PRval) < 2
    Wmean=PRval;
    Err=PRerr;
else
    
    % Apply Peirce filter if requested
    
    if Filter == 1 && length(PRval) > 2;
        [PRval,PRerr]=Peirce(PRval, PRerr);
    end

    % Check Peirce ouput length
    if length(PRval) < 2
        Wmean=PRval;
        Err=PRerr;
    else
        
        [~,Wmean,Err]=CorrWM(PRval,PRerr);
        
        % Compute error as the weighted standard deviation instead of the error of
        % the weighted mean and take the higher value
        
        if Wstdval==1;
            Wed_Stdev = Wstd (PRval, (1./PRerr).^2);
            % Test on the highest error value
            Err = max(Wed_Stdev,Err);
        end
    end
end



% Export
DataOut.WM=[Wmean Err];

% Write json
DataOut=savejson(name,DataOut);
NameOut=strcat(name(1:end-2),'out');
fileID=fopen(NameOut,'w');
fprintf(fileID,'%s',DataOut);
fclose(fileID);

disp("call to GetWMf OK")

end
